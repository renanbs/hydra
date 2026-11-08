# AUR — fonte espelho (leitura)

Fonte de verdade: repos AUR (`hydra-ade`, `hydra-ade-git`) via `git clone ssh://aur@aur.archlinux.org/<pkg>`.
Estes arquivos são espelho para revisão no GitHub. Para publicar:

```bash
# estável (a cada tag v*)
cd $(mktemp -d) && git clone ssh://aur@aur.archlinux.org/hydra-ade.git .
cp $REPO/packaging/aur/PKGBUILD.stable PKGBUILD  # + bump pkgver + updpkgsums
makepkg --printsrcinfo > .SRCINFO
git add PKGBUILD .SRCINFO && git commit -m "vX.Y.Z" && git push
```

Manter `PKGBUILD.stable` sincronizado com o AUR após cada release.
