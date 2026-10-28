import {it,expect} from 'vitest';
import {demo} from '../src/domain/demo';
import {themeColor,themeData} from '../src/domain/theme';
it('modernise les anciennes cartes et leurs instantanés sans changer les résultats ni les couleurs personnalisées',()=>{
 const source=demo(1000000),before=structuredClone(source);source.courses[0].color='#123456';
 const result=themeData(source);
 expect(result.courses[0].color).toBe('#123456');
 expect(themeColor('#568D72')).toBe('#ffa74b');
 expect(result.runs[0].courseSnapshot.color).toBe('#f68710');
 expect(result.runs.map(({courseSnapshot,...run})=>run)).toEqual(source.runs.map(({courseSnapshot,...run})=>run));
 expect(source.runs).toEqual(before.runs);
 expect(themeData(result)).toEqual(result);
});
