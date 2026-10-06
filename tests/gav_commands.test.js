const assert=require('assert'), fs=require('fs'), path=require('path'), vm=require('vm');
const root=path.join(__dirname,'..');
const output={innerHTML:'',scrollTop:0};
const graph={style:{},value:[],updates:0,update(value){this.value=value;this.updates++;}};
const context=vm.createContext({
  console:{log(){}},renderMathInElement(){},
  document:{querySelector:selector=>selector==='.console'?output:{appendChild:x=>x}}
});
context.window=context;
vm.runInContext(fs.readFileSync(path.join(root,'ganja.js'),'utf8'),context);
context.testGraph=graph;
const html=fs.readFileSync(path.join(root,'examples/gav.html'),'utf8');
const scripts=[...html.matchAll(/<SCRIPT>([\s\S]*?)<\/SCRIPT>/gi)].map(m=>m[1]);
// Run the real GAV command handler and preamble; drawing and ACE are tested
// separately. Load ganja in this realm so free identifiers use the same globals.
vm.runInContext(scripts[0].split('// Setup ACE editor')[0].replace('var Graph =','A.graph=()=>testGraph; var Graph ='),context);
vm.runInContext(scripts[1],context);
const run=command=>vm.runInContext('addCmd('+JSON.stringify(command)+')',context);
assert.strictEqual(run('c = pt(e3)'),'');
const c=context.c;
assert.strictEqual(run('c'),'');
assert.strictEqual(graph.value[graph.value.length-1],c,'c lookup must return the assigned point');
assert.ok(!output.innerHTML.includes('ans = }'),'tokenizer state must not leak into output');
run('a = pt(e1)'); run('b = pt(e2)');
const before=graph.updates;
assert.strictEqual(run('dynamic { c = a ^ b ^ ni; } // ; prevents render'),'');
assert.strictEqual(typeof context.c,'function');
assert.strictEqual(graph.updates,before,'trailing semicolon suppresses rendering');
assert.strictEqual(run('cyan(c)'),'');
assert.strictEqual(run('red(a ^ b ^ no)'),'');
const initial=Array.from(context.c());
run('a = pt(2e1)');
assert.notDeepStrictEqual(Array.from(context.c()),initial,'dynamic values follow reassigned inputs');
console.log('GAV assignment, lookup, dynamic commands, and comments: pass');
