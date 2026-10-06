const assert=require('assert');
const Algebra=require('../ganja.js');
const A=Algebra(4,1);

// Free identifiers in translated code belong to the caller's global scope,
// not the tokenizer's c/t/tok/options or the algebra generator's p/q/r.
for (const name of ['c','t','tok','tokens','options','p','q','r','res','basis','txt']) {
  const previous=Object.getOwnPropertyDescriptor(global,name);
  try {
    const point=A.Vector(0,0,1,0,1);
    global[name]=point;
    const lookup=A.inline(new Function('return '+name));
    assert.strictEqual(lookup(),point,'lookup '+name);
    const dynamic=A.inline(new Function('return ()=>'+name))();
    global[name]=A.Vector(1,0,0,0,1);
    assert.strictEqual(dynamic(),global[name],'dynamic lookup '+name);
  } finally {
    if(previous) Object.defineProperty(global,name,previous); else delete global[name];
  }
}
assert.strictEqual(A.inline(()=>this)(),A,'arrow this remains the algebra class');
assert.strictEqual(A.inline(()=>Algebra(0,1))().describe().metric[1],-1);
assert.strictEqual(A.inline((c)=>c)(42),42,'explicit parameters take precedence');
assert.strictEqual(A.inline(()=>{const c=7;return c})(),7,'local variables take precedence');
assert.strictEqual(A.inline(()=>this.inline(()=>1e1))()()[1],1,'nested inline literals');
console.log('Inline variable scope: pass');
