import test from 'node:test';
import assert from 'node:assert/strict';
import {canEditMessage,capacityConflicts} from '../src/lib/workspace-rules.ts';
test('message edits end exactly two hours after sending, independent of edit times',()=>{
 const sent='2026-09-11T12:00:00.000Z';const at=Date.parse(sent);
 assert.equal(canEditMessage(sent,at+7199999),true);assert.equal(canEditMessage(sent,at+7200000),false);assert.equal(canEditMessage(sent,at-1),false);assert.equal(canEditMessage('invalid',at),false);
});
test('capacity checks compare the same crew in the same department and exclude outsourced work',()=>{
 const a={task_id:'a',lane:'Crew A',mode:'in_house',start_date:'2026-10-01',finish_date:'2026-10-05'};
 const b={...a,task_id:'b',lane:'crew a',start_date:'2026-10-05',finish_date:'2026-10-08'};
 const c={...b,task_id:'c',mode:'outsourced'};
 const d={...b,task_id:'d'};
 const e={...b,task_id:'e',start_date:'2026-10-06'};
 assert.deepEqual(capacityConflicts([a,b,c,d,e],a,id=>id==='d'?'lighting':'shop').map(x=>x.task_id),['b']);
 assert.deepEqual(capacityConflicts([a,b,c],c,()=> 'shop'),[]);
});
