// Canvas utils
// This file (canvas.tsx) is made available to you under the CC0 license [public domain]

function makeHidpi2D(canvas:HTMLCanvasElement, context:RenderingContext) {
  const { width, height } = canvas.getBoundingClientRect()
  const { devicePixelRatio=1 } = window
  canvas.style.width = `${width}px`
  canvas.style.height = `${height}px`
  canvas.width = width * devicePixelRatio
  canvas.height = height * devicePixelRatio
}

export {makeHidpi2D}
