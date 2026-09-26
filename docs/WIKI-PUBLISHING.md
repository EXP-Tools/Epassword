# Publishing the GitHub Wiki

GitHub stores Wiki pages in a separate Git repository. Committing docs/wiki does not publish those pages.

First create and save Home at https://github.com/EXP-Tools/Epassword/wiki in the web interface. Then run from this repository with Git credentials that can push:

~~~sh
git clone https://github.com/EXP-Tools/Epassword.wiki.git .wiki-publish
node scripts/render-wiki.cjs .wiki-publish
git -C .wiki-publish diff
git -C .wiki-publish add --all
git -C .wiki-publish commit -m "Publish bilingual Epassword documentation"
git -C .wiki-publish push origin HEAD
~~~

For subsequent updates, replace clone with git -C .wiki-publish pull --ff-only. Render, review, commit and push again; skip commit if unchanged. The renderer overwrites generated pages and sidebar, preserving other pages. Edit source documents rather than generated copies.

English and Chinese usage guides, installation and API reference are included. Links are converted to Wiki URLs or repository files. Desktop build CI does not publish the Wiki.

## 中文

GitHub Wiki 使用独立 Git 仓库，提交 docs/wiki 不会自动发布。首次在网页创建并保存 Home，然后执行上述命令。

后续更新将 clone 改为 git -C .wiki-publish pull --ff-only，再生成、检查差异、提交并推送；没有变化则跳过提交。请编辑源文档。生成器包含中英文使用、安装与 API 指南，并转换链接，保留其他非生成页面。桌面构建流水线不会发布 Wiki。
