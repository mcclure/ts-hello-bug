import { makeHidpi2D } from "./canvas"
import _canvas2image from "./canvas2image"
const canvas2image = _canvas2image("gpupresent")

// ----- Data helpers -----


// ----- Data -----

const animateV = false
const printFpsV = true
const preserveV = false
let triggerSaveDraw = false

let saveDrawBufferCache:GPUBuffer

// ----- Display helpers -----

async function AppCanvas({gpu}:{gpu:GPU}) {
  const attributes = preserveV ? { preserveDrawingBuffer: true } : undefined
  const stillMounted = true

  const canvas = document.getElementById("staticCanvas") as HTMLCanvasElement
  {
      const context = canvas.getContext("gpupresent", attributes)
makeHidpi2D(canvas, context)
      const gpuContext = (context as any) as GPUCanvasContext
console.log("AppCanvas: DRAWING")

      const width  = canvas.width
      const height = canvas.height
      
      // ARE YOU READING THIS IN 2022? REMOVE ME
      // This next line is to work around a known bug in Chrome Canary as of 2021-01-18
      canvas.width = width; canvas.height = height

      // To draw in WebGPU, you need the following things:
      // - You need mesh data to draw,
      //   and descriptors to describe the format of the mesh data.
      // - You need a vertex shader to convert the meshes into NDCs and a fragment shader to rasterize.
      // - You need a pipeline description to hold the mesh and shader descriptions.
      // - You need a command buffer to tell the pipeline to execute,
      //   and render pass encoders to add commands to the command buffer,
      //   and a command buffer encoder to create the render pass encoders.
      // - You need a swapchain to vend the texture that will be drawn on screen,
      //   and each frame you need the texture to draw into
      //   and a view on the texture to make the texture drawable.

      // You get a queue, from a device, from an adapter.
      // The queue is used to submit commands to be drawn.
      const adapter = await gpu.requestAdapter()
      const device = await adapter.requestDevice()
      const queue = device.queue

      // The swapchain is used to submit framebuffers [textures] to the display
      const swapChainDescription: GPUSwapChainDescriptor = {
        device: device,
        format: "bgra8unorm",
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC
      }

      // Scene Data [position color, indices for a single triangle]
      const positions = new Float32Array([
         1.0, -1.0, 0.0,
        -1.0, -1.0, 0.0,
         0.0,  1.0, 0.0
      ])
      const colors = new Float32Array([
         1.0, 0.0, 0.0,
         0.0, 1.0, 0.0,
         0.0, 0.0, 1.0
      ])
      const indices = new Uint16Array([ 0, 1, 2 ])

      // Helper function for creating GPUBuffer(s) out of Typed Arrays
      const createBuffer = (arr: Float32Array | Uint16Array, usage: number) => {
          // Align to 4 bytes (required when mapped)
          const desc = { size: ((arr.byteLength + 3) & ~3), usage, mappedAtCreation: true }
          const buffer = device.createBuffer(desc)
          const bufferMapped = buffer.getMappedRange(0,)

          const writeArray =
              arr instanceof Uint16Array ? new Uint16Array(bufferMapped) : new Float32Array(bufferMapped)
          writeArray.set(arr)
          buffer.unmap()
          return buffer
      }

      // Convert our scene data to GPU Buffers
      const positionBuffer = createBuffer(positions, GPUBufferUsage.VERTEX)
      const colorBuffer = createBuffer(colors, GPUBufferUsage.VERTEX)
      const indexBuffer = createBuffer(indices, GPUBufferUsage.INDEX)

      // 👋 Helper function for creating GPUShaderModule(s) out of SPIR-V files
      const loadData = async (filePath: string) =>
        fetch(new Request(filePath), { method: "GET", mode: "cors" }).then((res) =>
          res.arrayBuffer().then((arr) => new Uint32Array(arr))
        )
      const loadShader = async (shaderPath: string) =>
        await device.createShaderModule({code: await loadData(shaderPath)})

      const vShader = await loadShader("triangle.vert.spv")
      const fShader = await loadShader("triangle.frag.spv")

      const layout: GPUPipelineLayout = device.createPipelineLayout({bindGroupLayouts:[]});

      const positionBufferDesc: GPUVertexBufferLayoutDescriptor = {
        attributes: [{ // GPUVertexAttributeDescriptor
          shaderLocation: 0, // [[attribute(0)]]
          offset: 0,
          format: "float3"
        }],
        arrayStride: 4 * 3, // sizeof(float) * 3
        stepMode: "vertex"
      };
      const colorBufferDesc: GPUVertexBufferLayoutDescriptor = {
        attributes: [{
          shaderLocation: 1, // [[attribute(1)]]
          offset: 0,
          format: "float3"
        }],
        arrayStride: 4 * 3, // sizeof(float) * 3
        stepMode: "vertex"
      };

      // The pipleine will actually do the work
      const pipelineDesc: GPURenderPipelineDescriptor = {
        layout,

        vertexStage: { // GPUShaderModuleDescriptor
          module: vShader,
          entryPoint: "main"
        },
        fragmentStage: {
          module: fShader,
          entryPoint: "main"
        },

        primitiveTopology: "triangle-list",
        colorStates: [ { // GPUColorStateDescriptor
          format: "bgra8unorm",
          alphaBlend: {
            srcFactor: "src-alpha",
            dstFactor: "one-minus-src-alpha",
            operation: "add"
          },
          colorBlend: {
            srcFactor: "src-alpha",
            dstFactor: "one-minus-src-alpha",
            operation: "add"
          },
          writeMask: GPUColorWrite.ALL
        } ],

        vertexState: { // GPUVertexStateDescriptor
          indexFormat: "uint16", // This will cause an error, this line is only allowed for triangle strips
          vertexBuffers: [ positionBufferDesc, colorBufferDesc ]
        },
        rasterizationState: { // GPURasterizationStateDescriptor
          frontFace: "cw",
          cullMode: "none"
        }
      }

      const pipeline = device.createRenderPipeline(pipelineDesc);

      const swapchain: GPUSwapChain = gpuContext.configureSwapChain(swapChainDescription)

      let lastPrintedFps:number // Date.getTime value
      let fpsSince = 1 // How many RAFs since last fps print?

      const frame = () => {
        // Swapchain automatically creates a color texture (but not a depth texture)
        const colorTexture = swapchain.getCurrentTexture()
        const colorTextureView = colorTexture.createView()

        const commandEncoder = device.createCommandEncoder();
        {
          let r, g, b
          if (animateV) {
            const now = new Date().getTime();

            if (printFpsV) { // Print FPS
              if (lastPrintedFps === undefined) {
                console.log("AppCanvas: STARTING FPS PRINT")
                lastPrintedFps = now;
              } else {
                const gap = now - lastPrintedFps
                if (gap > 10 * 1000) { // If 10 seconds have passed
                  console.log("AppCanvas: FPS last ~10 sec: " + ((fpsSince/gap)*1000).toLocaleString('en-US', {minimumFractionDigits:3, maximumFractionDigits:3, useGrouping:false}))
                  // In the case of long gaps with no RAFs, this may tell us something different than we wanted. But whatever
                  lastPrintedFps += 10 * 1000 * Math.floor(gap / (10 * 1000))
                  fpsSince = 1
                } else {
                  fpsSince++
                }
              }
            }

            const time = (Math.cos( now/(1000*2) ) + 1)/2 // Intentionally no pi factor

            r = time; g = b = time/2
          } else {
            r = g = b = 0
          }

          const passEncoder = commandEncoder.beginRenderPass({ // GPURenderPassDescriptor
            colorAttachments: [
              { //GPURenderPassColorAttachmentDescriptor
                attachment: colorTextureView,
                loadValue: { r,g,b, a: 1 },
                storeOp: "store"
              }
            ],
          });

          passEncoder.setPipeline(pipeline);
          passEncoder.setViewport(0, 0, canvas.width, canvas.height, 0, 1);
          passEncoder.setScissorRect(0, 0, canvas.width, canvas.height);
          passEncoder.setVertexBuffer(0, positionBuffer);
          passEncoder.setVertexBuffer(1, colorBuffer);
          passEncoder.setIndexBuffer(indexBuffer, "uint16");
          passEncoder.drawIndexed(3, 1, 0, 0, 0);
          passEncoder.endPass();
        }


        let triggerSaveBuffer: GPUBuffer
        let triggerSaveSize: number
        if (triggerSaveDraw) { // Do this before or after queue.submit??
          const roundUp256 = (x:number) => Math.ceil(x/256)*256
          triggerSaveSize = canvas.width*canvas.height*4
          const desc = { size: roundUp256(triggerSaveSize), usage:GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST }
          triggerSaveBuffer = device.createBuffer(desc)
          const textureView = { texture:colorTexture }
          const bufferView = { offset: 0, bytesPerRow:canvas.width*4, rowsPerImage:canvas.height, buffer:triggerSaveBuffer }

          commandEncoder.copyTextureToBuffer(textureView, bufferView, {width:canvas.width, height:canvas.height, depth:undefined})
        }

        queue.submit([ commandEncoder.finish() ]);

        if (triggerSaveDraw) {
          (async () => {
            await triggerSaveBuffer.mapAsync(GPUMapMode.READ, 0, triggerSaveSize)
            const arrayBuffer = triggerSaveBuffer.getMappedRange(0, triggerSaveSize)
            console.log(arrayBuffer)
            // Terrifying oneliner from https://stackoverflow.com/questions/9267899/arraybuffer-to-base64-encoded-string
            // Notice: Data is not PNG encoded >_> I use this program to view it. https://github.com/sveinbjornt/PixlView
            canvas2image.saveFile(canvas2image.makeURI(btoa(Array.from(new Uint8Array(arrayBuffer)).map(b => String.fromCharCode(b)).join('')), canvas2image.downloadMime), "rgba", "download-cttb")
            triggerSaveBuffer.destroy()
          })()
          triggerSaveDraw = false
        }
      }

      if (animateV) {
console.log("AppCanvas: STARTING ANIMATE")
        const frameLoop = () => {
          if (stillMounted) {
            frame()
            requestAnimationFrame(frameLoop)
          }
        }

        requestAnimationFrame(frameLoop)
      } else {
        frame()
      }
    }
  }

// ----- Display -----

function Content() {
  const gpu = navigator.gpu
  AppCanvas({gpu})
}

addEventListener('load', Content)
