import { Component, OnInit } from '@angular/core';
import { default as mapData } from '../data/map.json';
import * as _ from 'lodash';

export const SQUAD_WIDTH: number = 240;
export const FILTERS_STORAGE_KEY: string = 'qs:role-map-explorer:filters';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {

  public data: any = {};

  public filters: any[] = [];

  public ngOnInit(): void {
    this.loadFilters();
    this.applyFilters();
  }

  public hex2rgba(hex: string, alpha: number = 1): string {
    const [r, g, b] = hex.match(/\w\w/g).map(x => parseInt(x, 16));
    return `rgba(${r},${g},${b},${alpha})`;
  };

  public getTribeStyles(tribe: any): any {
    return {
      flex: `0 0 ${ tribe.squads.length * SQUAD_WIDTH }px`,
    };
  }

  public getChapterStyles(chapter: any, tribe: any = null): any {
    const styles: any = {
      border: `solid 1px ${ this.hex2rgba(chapter.color) }`,
      'background-color': this.hex2rgba(chapter.color, 0.1),
    };

    if (tribe && tribe.name === this.data.tribes[this.data.tribes.length - 1].name) {
      styles['border-right-width'] = '1px !important';
    }

    return styles;
  }

  public getSquadChapterMembers(squad: any, chapterName: string): any {
    return squad.members.filter((x: any) => x.chapter === chapterName);
  }

  public getMemberClasses(member: any): any {
    return {
      vacant: !!member.vacant,
      future: !!member.future,
      contractor: !!member.contractor,
      review: !!member.review,
      split: this.getSplit(member) < 100,
      transitional: !!member.transitional,
    };
  }

  public getSplit(member: any): number {
    const occurrences = mapData.tribes
      .flatMap((x: any) => x.squads.flatMap((y: any) => y.members))
      .filter((x: any) => x.name === member.name && !x.future)
      .length;

    return Math.round((1 / occurrences) * 100);
  }

  public getSquadMemberCount(squad: any): string {
    const total = _.filter(squad.members, x => !x.future);
    const vacancies = _.filter(total, x => !!x.vacant);
    return this.getTotalSummary(total, vacancies);
  }

  public getAllMembers(): any[] {
    const members = _.flatMap(this.data.tribes, x => _.flatMap(x.squads, y => y.members));
    return _.filter(members, x => !x.future);
  }

  public getAllMembersCount(): string {
    const total = this.getAllMembers();
    const vacancies = _.filter(total, x => !!x.vacant);
    return this.getTotalSummary(total, vacancies);
  }

  public getChapterMemberCount(chapter: any): string {
    const members = this.getAllMembers();
    const total = _.uniqBy(_.filter(members, x => x.chapter === chapter.name), x => x.name);
    const vacancies = _.filter(total, x => !!x.vacant);
    return this.getTotalSummary(total, vacancies);
  }

  public getTotalSummary(total: any[], vacancies: any[]): string {
    if (_.find(this.filters, x => Object.keys(x)[0] === 'vacant' && x['vacant'] === true)) {
      return vacancies.length.toString();
    }

    if (_.find(this.filters, x => Object.keys(x)[0] === 'vacant' && x['vacant'] === false)) {
      return (total.length - vacancies.length).toString();
    }

    return `${ (total.length - vacancies.length ) } / ${ total.length }`;
  }

  public getSelectFilterValue(key: string): any {
    const filter = _.find(this.filters, x => this.getFilterKey(x) === key);
    if (!filter) {
      return 'all';
    }
    return this.getFilterValue(filter);
  }

  public setSelectFilterValue(key: string, value: any): void {
    const filter = { [key]: value };
    this.removeFiltersByKey(key);

    if (value !== 'all') {
      this.filters.push(filter);
    }

    this.persistFilters();
    this.applyFilters();
  }

  public removeFiltersByKey(key: string): void {
    this.filters = _.filter(this.filters, x => this.getFilterKey(x) !== key);
  }

  public get vacancyFilter(): any {
    return this.getSelectFilterValue('vacant');
  }

  public set vacancyFilter(value: boolean | string) {
    this.setSelectFilterValue('vacant', value);
  }

  public get squadTypeFilter(): string {
    return this.getSelectFilterValue('squadType');
  }

  public set squadTypeFilter(value: string) {
    this.setSelectFilterValue('squadType', value);
  }

  public get contractorFilter(): any {
    return this.getSelectFilterValue('contractor');
  }

  public set contractorFilter(value: boolean | string) {
    this.setSelectFilterValue('contractor', value);
  }

  public getFilters(key: string): any[] {
    return this.filters.filter((x: any) => this.getFilterKey(x) === key)
      .map((x: any) => this.getFilterValue(x));
  }

  public applyFilters(): void {
    this.data = _.cloneDeep(mapData);

    const squadFilters = this.getFilters('squad');
    const tribeFilters = this.getFilters('tribe');
    const chapterFilters = this.getFilters('chapter');
    const memberFilters = this.getFilters('member');
    const contractorFilters = this.getFilters('contractor');
    const futureFilters = this.getFilters('future');
    const vacancyFilters = this.getFilters('vacant');
    const squadTypeFilters = this.getFilters('squadType');

    if (chapterFilters.length > 0) {
      // Filter chapters
      this.data.chapters = _.filter(this.data.chapters, (x: any) => chapterFilters.includes(x.name));
    }

    if (tribeFilters.length > 0) {
      // Filter tribes
      this.data.tribes = _.filter(this.data.tribes, (x: any) => tribeFilters.includes(x.name));
    }

    // Filter members
    for (const tribe of this.data.tribes) {
      for (const squad of tribe.squads) {
        squad.members = _.filter(squad.members, x => {
          if (memberFilters.length > 0 && !memberFilters.includes(x.name)) {
            return false;
          }

          if (chapterFilters.length > 0 && !chapterFilters.includes(x.chapter)) {
            return false;
          }

          if (contractorFilters.length > 0 && !!x.contractor !== contractorFilters[0]) {
            return false;
          }

          if (vacancyFilters.length > 0 && !!x.vacant !== vacancyFilters[0]) {
            return false;
          }

          if (futureFilters.length > 0 && !!x.future !== futureFilters[0]) {
            return false;
          }

          return true;
        });
      }
    }

    // Filter squads
    for (const tribe of this.data.tribes) {
      if (squadFilters.length > 0) {
        tribe.squads = tribe.squads.filter((x: any) => squadFilters.includes(x.name));
      }

      if (squadTypeFilters.length > 0) {
        tribe.squads = tribe.squads.filter((x: any) => x.type === squadTypeFilters[0]);
      }
    }

    // Filter any squads that don't have any members after filters are applied.
    for (const tribe of this.data.tribes) {
      tribe.squads = _.filter(tribe.squads, (x: any) => x.members.length > 0);
    }

    // Filter any tribes that don't have any squads after filters are applied.
    this.data.tribes = _.filter(this.data.tribes, (x: any) => x.squads.length > 0);

    // Only show chapters with members matching the filters
    const visibleChapters = _.uniq(_.flatMap(this.data.tribes, x => _.flatMap(x.squads, y => _.flatMap(y.members, z => z.chapter))));
    this.data.chapters = _.filter(this.data.chapters, (x: any) => visibleChapters.includes(x.name));
  }

  public persistFilters(): void {
    window.localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(this.filters));
  }

  public loadFilters(): void {
    this.filters = JSON.parse(window.localStorage.getItem(FILTERS_STORAGE_KEY) || '[]');
  }

  public addFilter(type: string, value: string): void {
    const filter = { [type]: value }
    if (!_.find(this.filters, filter)) {
      this.filters.push(filter);
      this.applyFilters();
    }
    else {
      this.removeFilter(filter);
    }
    this.persistFilters();
  }

  public removeFilter(filter: any): void {
    _.remove(this.filters, x => {
      return this.getFilterKey(x) === this.getFilterKey(filter) &&
        this.getFilterValue(x) === this.getFilterValue(filter);
    });
    this.applyFilters();
    this.persistFilters();
  }

  public getFilterKey(filter: any): string {
    return Object.keys(filter)[0];
  }

  public getFilterValue(filter: any): any {
    return filter[Object.keys(filter)[0]];
  }

  public clearAllFilters(): void {
    this.filters = [];
    this.persistFilters();
    this.applyFilters();
  }
}
