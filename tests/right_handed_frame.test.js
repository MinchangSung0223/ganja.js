const assert = require('assert');
const Algebra = require('../ganja.js');

const PGA = Algebra(3,0,1);
const CGA = Algebra(4,1);
const point = (x,y,z,w=1) => PGA.Vector(1,x,y,z).Dual.Scale(w);
const world = p => [-p[13]/p[14],p[12]/p[14],-p[11]/p[14]];
const near = (actual,expected,epsilon=1e-5) => actual.forEach((x,i) => assert.ok(Math.abs(x-expected[i])<epsilon, `${actual} != ${expected}`));

// An in-memory WebGL canvas records the coordinates actually passed to the renderer.
function graph(items,algebra=PGA,options={},publicGraph=false) {
  const draws = [], pending = [], nodes = [];
  let boundBuffer, boundVA, currentMatrix, currentProjection;
  const gl = new Proxy({
    ARRAY_BUFFER:34962, ELEMENT_ARRAY_BUFFER:34963, FLOAT:5126, STATIC_DRAW:35044,
    TRIANGLES:4, LINES:1, POINTS:0, UNSIGNED_SHORT:5123,
    VERTEX_SHADER:35633, FRAGMENT_SHADER:35632, COMPILE_STATUS:35713, LINK_STATUS:35714,
    TEXTURE0:33984, TEXTURE_2D:3553, RGBA:6408, UNSIGNED_BYTE:5121,
    createShader:()=>({}), createProgram:()=>({}), createTexture:()=>({}), createBuffer:()=>({}),
    getShaderParameter:()=>true, getProgramParameter:()=>true, getUniformLocation:(p,name)=>name,
    uniformMatrix4fv:(name,transpose,matrix)=>{if(name==='mv') currentMatrix=Array.from(matrix); if(name==='p') currentProjection=Array.from(matrix)},
    getExtension:()=>({createVertexArrayOES:()=>({attributes:{}}), bindVertexArrayOES:va=>{boundVA=va}, deleteVertexArrayOES:()=>{}}),
    bindBuffer:(target,buffer)=>{boundBuffer=buffer; if(target===34963) boundVA.index=buffer},
    bufferData:(target,data)=>{boundBuffer.data=Array.from(data)},
    vertexAttribPointer:(index)=>{boundVA.attributes[index]=boundBuffer},
    drawArrays:(type,start,count)=>draws.push({type,vertices:boundVA.attributes[0].data.slice(0,count*3),
      vertices2:boundVA.attributes[2]&&boundVA.attributes[2].data.slice(0,count*3),matrix:currentMatrix,projection:currentProjection}),
    drawElements:(type,count)=>draws.push({type,vertices:boundVA.attributes[0].data,indices:boundVA.index.data.slice(0,count),matrix:currentMatrix,projection:currentProjection})
  }, {get:(target,key)=>key in target?target[key]:()=>{}});
  global.devicePixelRatio = 1;
  global.self = {};
  global.performance = {now:()=>0};
  global.getComputedStyle = ()=>({width:'500px',height:'500px'});
  global.requestAnimationFrame = fn=>{pending.push(fn)};
  global.CustomEvent = class { constructor(type) { this.type=type } };
  global.document = {
    body:{contains:()=>true,appendChild:x=>{nodes.push(x);return x}},
    createElement:tag=>tag==='canvas'?{
      style:{},width:500,height:500,parentElement:{},
      getContext:type=>type==='2d'?{fillText:()=>{}}:gl,
      getBoundingClientRect:()=>({left:0,top:0,right:500,bottom:500,width:500,height:500}),
      dispatchEvent:()=>{}
    }:{style:{}}
  };
  const canvas=publicGraph?algebra.graph(items,{gl:true,...options}):
    algebra.graphGL(items,{gl:true,camera:algebra.Scalar(1),...options});
  pending.shift()();
  return {canvas,draws,pending,nodes};
}

const O=point(0,0,0), X=point(1,0,0), Y=point(0,1,0), Z=point(0,0,1);
near([X[11],X[12],X[13],X[14]],[0,0,-1,1]);
near([Y[11],Y[12],Y[13],Y[14]],[0,1,0,1]);
near([Z[11],Z[12],Z[13],Z[14]],[-1,0,0,1]);
const axes=[world(X),world(Y),world(Z)];
axes.forEach((v,i)=>near(v,[0,1,2].map(j=>i===j?1:0)));
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
near(cross(axes[0],axes[1]),axes[2]);
const determinant=(a,b,c)=>a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]);
near([determinant(...axes)],[1]);
near(world(point(2,3,4,2)),[2,3,4]);

const geometry=graph([X,[O,X],[O,X,Y],{data:[O,X,Y],idx:[0,1,2]},0xff0000]);
assert.ok(geometry.draws.some(d=>d.type===0 && d.vertices.join(',')==='1,0,0'), 'point X');
assert.ok(geometry.draws.some(d=>d.type===4 && !d.indices && d.vertices.slice(0,9).join(',')==='0,0,0,1,0,0,0,1,0'), 'triangle');
assert.ok(geometry.draws.some(d=>d.type===4 && d.indices && d.vertices.slice(0,9).join(',')==='0,0,0,1,0,0,0,1,0'), 'indexed mesh');
assert.ok(geometry.draws.some(d=>d.type===4 && !d.indices && d.vertices.length===18 && d.vertices.slice(6,9).join(',')==='1,0,0'), 'line');
assert.ok(graph([{data:[[O,point(1,0,0),point(0,1,0)]]}]).draws.some(d=>d.type===4 &&
  d.vertices.slice(0,9).join(',')==='0,0,0,1,0,0,0,1,0'), 'unindexed mesh');
const mesh=transform=>graph([{data:[O,point(1,0,0),point(0,1,0)],idx:[0,1,2],transform}]).draws[0];
const identityMesh=mesh(PGA.Scalar(1));
const translationsForModel=[[5,-0.5],[6,-0.5],[7,-0.5]];
translationsForModel.forEach(([blade,coefficient],i)=>{
  const moved=mesh(PGA.Coeff(blade,coefficient).Exp());
  near(moved.matrix.slice(12,15).map((v,j)=>v-identityMesh.matrix[12+j]),[0,1,2].map(j=>i===j?1:0));
});
const rotatedMesh=mesh(PGA.Coeff(8,-Math.PI/4).Exp());
near([rotatedMesh.matrix[0],rotatedMesh.matrix[1],rotatedMesh.matrix[2]],[0,1,0]);
const particle=graph([{motor:PGA.Coeff(5,-0.5).Exp(),xRange:0,yRange:0,zRange:0}]).draws[0];
near(particle.vertices2.slice(0,3).map((x,i)=>x-particle.vertices[i]),[1,0,0]);
const cameraFrame=graph([point(1,0,0)],PGA,{camera:PGA.Coeff(8,Math.PI/4).Exp()}).draws[0];
const cm=cameraFrame.matrix;
near([determinant([cm[0],cm[1],cm[2]],[cm[4],cm[5],cm[6]],[cm[8],cm[9],cm[10]])],[1]);
near(cameraFrame.vertices,[1,0,0]);
const projected=(p,draw)=>{
  const m=draw.matrix, projection=draw.projection;
  const x=m[0]*p[0]+m[4]*p[1]+m[8]*p[2]+m[12];
  const y=m[1]*p[0]+m[5]*p[1]+m[9]*p[2]+m[13];
  const z=m[2]*p[0]+m[6]*p[1]+m[10]*p[2]+m[14];
  const w=projection[11]*z;
  return [projection[0]*x/w,projection[5]*y/w,(projection[10]*z+projection[14])/w,w];
};
const straightView=graph([point(1,0,0)],PGA,{},true).draws[0];
assert.ok(straightView.matrix[14]<0 && straightView.projection[11]<0, 'camera faces -Z');
const nearZ=projected([1,0,1],straightView), farZ=projected([1,0,-1],straightView);
assert.ok(nearZ[0]>farZ[0], '+Z must approach the camera and grow in perspective');
assert.ok(nearZ[2]<farZ[2], '+Z must win the depth test over -Z');
assert.ok(projected([0,0,6],straightView)[3]<0, 'points behind the camera must have negative clip W');
const dragged=point(1,0,0), rotatedInteractive=graph([dragged],PGA,{h:0.55,p:-0.3,z:7},true);
const before=projected([1,0,0],rotatedInteractive.draws[0]);
const pixelX=250*(before[0]+1), pixelY=250*(1-before[1]);
rotatedInteractive.canvas.onmousedown({detail:1,button:0,x:pixelX,y:pixelY,preventDefault(){},stopPropagation(){}});
rotatedInteractive.canvas.onmousemove({movementX:25,movementY:0,offsetX:pixelX+25,offsetY:pixelY,buttons:1});
const after=projected(world(dragged),rotatedInteractive.draws[0]);
near(after.slice(0,2),[before[0]+0.1,before[1]]);
near(after.slice(2),before.slice(2));
const transformedView=graph([{data:[O,point(1,0,0),point(0,1,0)],idx:[0,1,2],transform:PGA.Scalar(1)}],
  PGA,{h:0.55,p:-0.3,z:7},true).draws[0];
near(transformedView.matrix,rotatedInteractive.draws[0].matrix);

const interactive=graph([X]);
interactive.canvas.onmousedown({detail:1,button:0,x:375,y:250,preventDefault(){},stopPropagation(){}});
interactive.canvas.onmousemove({movementX:25,movementY:0,offsetX:400,offsetY:250,buttons:1});
assert.ok(world(X)[0]>1, `dragged X did not move right: ${world(X)}`);
const interactiveY=graph([point(0,1,0)]);
interactiveY.canvas.onmousedown({detail:1,button:0,x:250,y:125,preventDefault(){},stopPropagation(){}});
interactiveY.canvas.onmousemove({movementX:0,movementY:25,offsetX:250,offsetY:150,buttons:1});
assert.ok(world(interactiveY.canvas.value[0])[1]<1, 'dragging down must reduce world Y');
const interactiveZ=graph([point(0,0,1)]);
interactiveZ.canvas.onmousedown({detail:1,button:0,x:250,y:250,preventDefault(){},stopPropagation(){}});
interactiveZ.canvas.onmousemove({movementX:50,movementY:0,offsetX:300,offsetY:250,buttons:1});
near(world(interactiveZ.canvas.value[0]),[0.32,0,1]);
const label=graph([point(1,0,0),'X'],PGA,{htmlText:true});
assert.ok(parseFloat(label.nodes[0].style.left)>250, 'HTML text anchor follows positive X');
const hiddenLabel=graph([point(0,0,6),'behind'],PGA,{htmlText:true});
assert.strictEqual(hiddenLabel.nodes[0].style.visibility,'hidden');

// A PGA motor can use different blade signs for different translation axes.
const translations=[[5,-0.5],[6,-0.5],[7,-0.5]];
translations.forEach(([blade,coefficient],i)=>near(world(PGA.sw(PGA.Coeff(blade,coefficient).Exp(),O)),axes[i]));
translations.forEach(([blade,coefficient],i)=>{
  const orbit=u=>PGA.Coeff(blade,coefficient*u).Exp();
  orbit.dx=2;
  const rendered=graph([orbit]).draws;
  assert.ok(rendered.some(d=>d.type===4 && d.vertices.some((v,k)=>k%3===i && Math.abs(v-1)<1e-5)), `motor orbit axis ${i}`);
});
const orbitMesh=(u,v)=>PGA.Coeff(5,-u*0.5).Exp().Mul(PGA.Coeff(6,-v*0.5).Exp());
orbitMesh.dx=2; orbitMesh.dy=2;
assert.ok(graph([orbitMesh]).draws.some(d=>d.type===4 && d.indices &&
  d.vertices.some((x,i)=>i%3===0 && Math.abs(x-1)<1e-5) &&
  d.vertices.some((x,i)=>i%3===1 && Math.abs(x-1)<1e-5)), 'motor orbit mesh');
const rz=PGA.Coeff(8,-Math.PI/4).Exp();
near(world(PGA.sw(rz,point(1,0,0))),axes[1]);

const ni=CGA.Coeff(4,1).Add(CGA.Coeff(5,1));
const no=CGA.Coeff(5,0.5).Sub(CGA.Coeff(4,0.5));
const cgaPointAt=v=>no.Add(CGA.Vector(...v,0,0)).Add(ni.Scale(v.reduce((sum,x)=>sum+x*x,0)/2));
axes.forEach(v=>{
  const cgaPoint=no.Add(CGA.Vector(...v,0,0)).Add(ni.Scale(0.5));
  const extracted=[...CGA.LDot(1/ni.LDot(cgaPoint).s,cgaPoint).slice(1,4)].map(x=>-x);
  near(extracted,v);
  assert.ok(graph([cgaPoint],CGA,{conformal:true}).draws.some(d=>d.type===0 && d.vertices.every((x,i)=>Math.abs(x-v[i])<1e-5)),`CGA render ${v}`);
});
const cgaView=graph([cgaPointAt([1,0,0])],CGA,{conformal:true}).draws[0];
assert.ok(projected([1,0,1],cgaView)[0]>projected([1,0,-1],cgaView)[0], 'CGA +Z approaches the camera');
assert.ok(projected([1,0,1],cgaView)[2]<projected([1,0,-1],cgaView)[2], 'CGA +Z wins the depth test');
const cgaDragged=cgaPointAt([1,0,0]);
const cgaInteractive=graph([cgaDragged],CGA,{conformal:true,h:0.4,p:-0.2,scale:2});
const cgaBefore=projected([2,0,0],cgaInteractive.draws[0]);
const cx=250*(cgaBefore[0]+1), cy=250*(1-cgaBefore[1]);
cgaInteractive.canvas.onmousedown({detail:1,button:0,x:cx,y:cy,preventDefault(){},stopPropagation(){}});
cgaInteractive.canvas.onmousemove({movementX:15,movementY:20,offsetX:cx+15,offsetY:cy+20,buttons:1});
const cgaAfter=projected(Array.from(cgaDragged.slice(1,4),v=>2*v),cgaInteractive.draws[0]);
near(cgaAfter.slice(0,2),[cgaBefore[0]+0.06,cgaBefore[1]-0.08]);
near(cgaAfter.slice(2),cgaBefore.slice(2));
console.log('PGA point, line, triangle, mesh, picking, dragging, translations, rotation, and CGA coordinates: pass');
