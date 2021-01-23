This is a WebGPU+TypeScript+Preact "Hello World" app, modified to demonstrate methods of saving WebGPU canvas contents as a PNG.

The app basically consists of:
- [This tutorial](https://alain.xyz/blog/raw-webgpu), plus
- Changes for recent WebGPU updates based on consulting the spec and conversations with Brandon Jones, plus
- A Preact wrapper based on [this sample app](https://github.com/mcclure/ts-hello/tree/canvas), using preact-resize-observer to make the drawn area always a square power of 2
- A fork of [canvas2image](https://www.npmjs.com/package/canvas2image) for image downloading
- Options for: Animating or not animating (if animating, drawing will occur inside a requestAnimationFrame and the background will pulse red, otherwise drawing happens outside an RAF); creating the context with [preserveDrawingBuffer](https://www.khronos.org/registry/webgl/specs/latest/1.0/#5.2.1) or not; and three buttons for downloading the current canvas state using canvas.toDataURL, createImageBitmap/bitmaprenderer, and extracting the image in pure WebGPU using copyTextureToBuffer. (The third of these does not use PNG but rather downloads a raw RGBA buffer; Photoshop can decode these, but I use [this open source app](https://github.com/sveinbjornt/PixlView)).

In my testing with Chrome Canary as of 2021-01-23, the results I see are:
- Nothing draws. If I resize the window slightly, it starts drawing. I see this the same regardless of whether animation is occurring.
- When animating, the animation appears jittery to me, although my console.log FPS counter asserts drawing is occurring at 60 fps.
- toDataURL and createImageBitmap produce blank images, copyTextureToBuffer works.

Code is in `src/`, resources are in `static/` and when built it's installed in `site/`. Make sure to edit the package name, license and author in package.json when you fork it, and also edit license.txt unless you want to release in the public domain.

Created by Andi McClure.

[Usage instructions](run.txt)

[License](LICENSE.txt)
