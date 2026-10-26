import {it,expect} from 'vitest';
import {inspectStudents,studentFileText} from '../src/services/studentImport';
import * as XLSX from '@e965/xlsx';

it('lit un collage ÉcoleDirecte avec noms en une colonne et virgules de fin, sans en-tête',()=>{
 const result=inspectStudents('MARTEL Théo,,,,\nBELIN Léa,,,,\nBOREL Nina,,,,\nDUPONT-LECLERC Ana,,,,',[],'3e Test');
 expect(result).toMatchObject({invalid:0,duplicates:0});
 expect(result.students.map(p=>[p.lastName,p.firstName])).toEqual([
  ['MARTEL','Théo'],['BELIN','Léa'],['BOREL','Nina'],['DUPONT-LECLERC','Ana']
 ]);
});

it('accepte aussi un CSV/Excel en colonnes, avec ou sans en-tête',()=>{
 expect(inspectStudents('Nom;Prénom;Classe\nMARTEL;Théo;Ancienne classe',[],'3e Test').students[0].className).toBe('3e Test');
 expect(inspectStudents('MARTEL;Théo\nBELIN;Léa',[],'3e Test').students).toHaveLength(2);
 expect(inspectStudents('Nom\tPrénom\nMARTEL\tThéo',[],'3e Test').students).toHaveLength(1);
});

it('lit réellement un classeur Excel .xlsx, puis l’importe dans la classe sélectionnée',async()=>{
 const sheet=XLSX.utils.aoa_to_sheet([['Nom','Prénom'],['MARTEL','Théo'],['BELIN','Léa']]);
 const book=XLSX.utils.book_new();XLSX.utils.book_append_sheet(book,sheet,'Classe');
 const bytes=XLSX.write(book,{bookType:'xlsx',type:'array'});
 const file=new File([bytes],'classe.xlsx',{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
 const text=await studentFileText(file);
 expect(inspectStudents(text,[],'3e Test').students.map(p=>p.firstName)).toEqual(['Théo','Léa']);
});

it('ignore les six lignes administratives ÉcoleDirecte et démarre sous « Nom »',()=>{
 const exportED=['Edité le 25/10/2026 à 20:03;;;;Année scolaire : 2026 - 2027',
  ';Classe : 6e Exemple;;;;',';Prof principal : Exemple;;;;',';Effectif : 3 élèves;;;;',
  '(2 filles et 1 garçon);;;;',';;;;','Nom;;;;',
  'MARTIN Camille;;;;','DUPONT Léa;;;;','DE LA ROCHE Hugo;;;;'].join('\n');
 const parsed=inspectStudents(exportED,[],'6e Test');
 expect(parsed.invalid).toBe(0);
 expect(parsed.students.map(p=>[p.lastName,p.firstName])).toEqual([['MARTIN','Camille'],['DUPONT','Léa'],['DE LA ROCHE','Hugo']]);
});
