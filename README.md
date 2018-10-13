# Hugo based website

## Publish new content

```bash
$ hugo new post/my-new-post.md
```

## Development with reload

```bash
$ hugo server -D
```

## Update hugo

```bash
$ cd $GOPATH/src/github.com/gohugoio/hugo
$ git pull
$ make vendor
$ make install
```

## Theme customizations

`/layouts/partials/footer.html`

```
<!-- Ybug code -->
<script type='text/javascript'>
  (function () {
    window.ybug_settings = { "id": "b2cg6w01cs" };
    var ybug = document.createElement('script'); ybug.type = 'text/javascript'; ybug.async = true;
    ybug.src = 'https://ybug.io/api/v1/button/' + window.ybug_settings.id + '.js';
    var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ybug, s);
  })();
</script>
<!-- Ybug code end -->
```

```diff
diff --git a/layouts/partials/footer.html b/layouts/partials/footer.html
index b23f55f..13da3e3 100644
--- a/layouts/partials/footer.html
+++ b/layouts/partials/footer.html
@@ -47,3 +47,13 @@ var _hmt = _hmt || [];
 })();
 </script>
 {{ end }}
+<!-- Ybug code -->
+<script type='text/javascript'>
+  (function () {
+    window.ybug_settings = { "id": "b2cg6w01cs" };
+    var ybug = document.createElement('script'); ybug.type = 'text/javascript'; ybug.async = true;
+    ybug.src = 'https://ybug.io/api/v1/button/' + window.ybug_settings.id + '.js';
+    var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ybug, s);
+  })();
+</script>
+<!-- Ybug code end -->
```
