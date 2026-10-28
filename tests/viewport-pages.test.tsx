// @vitest-environment jsdom
import React from 'react';
import {it,expect,vi,afterEach} from 'vitest';
import {render,screen,cleanup,fireEvent,within} from '@testing-library/react';
import {ViewportRanking,ViewportGrid,pageCapacity,overviewGrid,rankingOverview} from '../src/components/ViewportPages';
afterEach(()=>{cleanup();vi.restoreAllMocks();});
it('calcule des pages qui tiennent en hauteur sans rétrécir les tuiles',()=>{
 for(const [w,h] of [[1248,450],[992,420],[736,730],[374,430]]){const c=pageCapacity(w,h,160,164);expect(c.rows*164+(c.rows-1)*10+50).toBeLessThanOrEqual(h);expect(c.columns*160+(c.columns-1)*10).toBeLessThanOrEqual(w);}
});
it('rend tous les élèves accessibles, dans l’ordre, après le changement de page',()=>{
 vi.spyOn(HTMLElement.prototype,'getBoundingClientRect').mockReturnValue({width:720,height:420,top:0,left:0,right:720,bottom:420,x:0,y:0,toJSON(){}});
 const ui=render(<ViewportGrid label="Pages test">{Array.from({length:15},(_,i)=><button key={i}>Élève {i+1}</button>)}</ViewportGrid>);
 expect(screen.getByText('Élève 1')).toBeTruthy();expect(screen.queryByText('Élève 7')).toBeNull();
 fireEvent.click(within(screen.getByRole('navigation',{name:'Pages test'})).getByRole('button',{name:'Suivants'}));
 expect(screen.getByText('Élève 7')).toBeTruthy();expect(screen.queryByText('Élève 1')).toBeNull();
 expect(ui.container.querySelectorAll('.viewport-grid button')).toHaveLength(6);
});
it('affiche le classement complet et le tri global sans bouton suivant',()=>{
 vi.spyOn(HTMLElement.prototype,'getBoundingClientRect').mockReturnValue({width:1200,height:350,top:0,left:0,right:1200,bottom:350,x:0,y:0,toJSON(){}});
 const ui=render(<ViewportRanking section={{title:'Général',columns:['Rang','Élève','Cartes'],rows:Array.from({length:25},(_,i)=>[i+1,`Élève ${i+1}`,i+1])}} sort={{column:0,direction:'desc'}} onSort={()=>{}}/>);
 expect(screen.getByText('Élève 25')).toBeTruthy();expect(screen.getByText('Élève 1')).toBeTruthy();
 expect(ui.container.querySelectorAll('tbody tr')).toHaveLength(25);
 expect(ui.container.querySelector('tbody tr')?.textContent).toContain('Élève 25');
 expect(screen.queryByRole('button',{name:'Suivants'})).toBeNull();
});
it('garde 25 et 36 élèves dans la grille complète sur ordinateur et tablette',()=>{
 for(const count of [25,36])for(const [w,h] of [[1248,320],[992,430],[736,680]]){const g=overviewGrid(w,h,count);expect(g.columns*g.rows).toBeGreaterThanOrEqual(count);expect(g.rows*g.tileHeight+(g.rows-1)*6).toBeCloseTo(h);expect(g.tileHeight).toBeGreaterThan(38);expect(g.tileWidth).toBeGreaterThan(180);}
 const l=rankingOverview(1248,330,25,5);expect(l.rows*l.rowHeight+34).toBeLessThanOrEqual(330);expect(l.fontSize).toBeGreaterThanOrEqual(12);
});
it('la liste complète reste accessible sans pagination en mode vue d’ensemble',()=>{
 vi.spyOn(HTMLElement.prototype,'getBoundingClientRect').mockReturnValue({width:1200,height:350,top:0,left:0,right:1200,bottom:350,x:0,y:0,toJSON(){}});
 render(<ViewportGrid overview>{Array.from({length:36},(_,i)=><button key={i}>Élève {i+1}</button>)}</ViewportGrid>);
 expect(screen.getByText('Élève 36')).toBeTruthy();expect(screen.queryByRole('button',{name:'Suivants'})).toBeNull();
});
