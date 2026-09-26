const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
if (!process.argv[2]) throw Error('Provide an output directory');
const dest = path.resolve(process.argv[2]);
if (dest === root) throw Error('Output must not be the repository root');
fs.mkdirSync(dest, {recursive:true});
const wiki = 'https://github.com/EXP-Tools/Epassword/wiki/';
const repo = 'https://github.com/EXP-Tools/Epassword/blob/master/';
const pages = new Map();
for (const f of fs.readdirSync(path.join(root,'docs/wiki')).filter(f=>f.endsWith('.md')))
  pages.set('docs/wiki/'+f,f.slice(0,-3));
for (const [source,name] of [['docs/API.md','API'],['docs/API.zh-CN.md','API-zh-CN'],['INSTALL.md','Installation'],['INSTALL.zh-CN.md','Installation-zh-CN']])
  pages.set(source,name);
for (const [source,name] of pages) {
  const input=fs.readFileSync(path.join(root,source),'utf8');
  const result=input.replace(/(\[[^\]]*\]\()([^)\s]+)(\))/g,(all,before,href,after)=>{
    if (/^(?:[a-z][a-z0-9+.-]*:|#|\/\/)/i.test(href)) return all;
    const [file,anchor]=href.split('#');
    const target=path.posix.normalize(path.posix.join(path.posix.dirname(source),file));
    if (!fs.existsSync(path.join(root,target))) throw Error('Broken link: '+source+' -> '+href);
    return before+(pages.has(target)?wiki+pages.get(target):repo+target)+(anchor?'#'+anchor:'')+after;
  });
  fs.writeFileSync(path.join(dest,name+'.md'),result);
}
fs.writeFileSync(path.join(dest,'_Sidebar.md'),['## Epassword','[Home]('+wiki+'Home) · [中文]('+wiki+'Home-zh-CN)',...[...pages.values()].filter(n=>!n.startsWith('Home')).map(n=>'- ['+n.replaceAll('-',' ')+']('+wiki+n+')')].join('\n')+'\n');
console.log('Rendered '+pages.size+' pages and sidebar.');
