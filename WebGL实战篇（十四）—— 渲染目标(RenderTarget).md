# WebGL实战篇（十四）—— 渲染目标(RenderTarget)

# 前言

Hello，又与大家再次见面了，今天我们要学习的内容是“渲染目标”。学习这一技术后，我们可以利用它做出一些常见的效果，比如“反射”，“折射”效果等等。废话不多说，让我们开始今天的学习吧！



# 简介RenderTarget

渲染目标这一词翻译自ThreeJS中的 `RenderTarget`对象。`RenderTarget`是一个用于渲染场景的中间缓冲区，通常用于离屏渲染和后期处理效果。RenderTarget允许您在不直接将渲染结果显示在屏幕上的情况下，对场景进行渲染和处理。



## 用途

1. 离屏渲染：`RenderTarget`可以在内存中创建一个虚拟的画布，将场景渲染到这个画布上，而不直接在屏幕上显示。这使您可以在不影响用户界面的情况下进行复杂的渲染操作，如阴影、反射、折射等。
2. 后期处理：`RenderTarget`通常用于实现后期处理效果，例如模糊、HDR（高动态范围）、色彩校正、景深效果等。您可以在`RenderTarget`上应用着色器程序，以修改渲染的像素数据，然后将结果显示在屏幕上。
3. 多通道渲染：`RenderTarget`可以用于同时渲染多个视图，例如渲染到不同的纹理或渲染到多个相机视角。这对于创建多重视图、VR和AR应用程序非常有用。



## 如何使用

使用`RenderTarget`的步骤一般包括以下几步：

1. 创建一个`RenderTarget`：使用Three.js的`WebGLRenderTarget`类创建一个`RenderTarget`对象，并指定其大小和其他属性。
2. 设置渲染目标：在渲染之前，将渲染目标设置为渲染器的渲染目标，以便场景将渲染到`RenderTarget`上，而不是直接显示在屏幕上。
3. 渲染场景：使用指定的相机和渲染器，将场景渲染到RenderTarget上。
4. 后期处理：如果需要，在`RenderTarget`上应用着色器程序或其他后期处理效果。
5. 将结果渲染到屏幕：最后，将`RenderTarget`的内容渲染到屏幕上，通常是作为全屏纹理。



# ThreeJS实战

上面对`RenderTarget`进行了简单的介绍，不过到目前为止你可能还是觉得略微有些抽象，让我们直接开始实战阶段！



## 搭建代码框架

我们先写出我们的代码框架，然后对其进行修改

```typescript
async function getTexture(url: string, repeat = false): Promise<Texture> {
    const img = await loadImage(url);
    const tex = new Texture(
        img,
        undefined,
        repeat ? RepeatWrapping : undefined,
        repeat ? RepeatWrapping : undefined
    );
    tex.needsUpdate = true;
    return tex;
}

export async function main(): Promise<ReturnType> {
    const canvas = document.getElementById('canvas') as HTMLCanvasElement;

    const fov = 45;
    const near = 0.1;
    const far = 1000;
    const aspect = canvas.width / canvas.height;

    const scene = new Scene();
    const renderer = new WebGLRenderer({ antialias: true, canvas });

    const mainTex = await getTexture(
        withBase('img/textures/Brick_Diffuse.JPG')
    );

    const mainCamera = new PerspectiveCamera(fov, aspect, near, far);

    const light = new DirectionalLight(0xffffff);

    const cubeGeo = new BoxGeometry(1, 1, 1);

    const phongMat = new MeshBasicMaterial({
        color: 0xffffff,
        map: mainTex,
    });

    const cubeMesh = new Mesh(cubeGeo, phongMat);

    scene.add(light);
    scene.add(cubeMesh);
    mainCamera.position.z = 2;

    const controls = new OrbitControls(mainCamera, renderer.domElement);
    let rfId = -1;
    let globalTime = 0;

    renderer.autoClear = false;
    const mainLoop = () => {
        controls.update();
        renderer.clear();
        renderer.render(scene, mainCamera);
        requestAnimationFrame(mainLoop);
    };

    //#endregion snippet
    const cancel = () => {
        cancelAnimationFrame(rfId);
    };

    return {
        mainLoop,
        cancel,
    };
}
```



上述代码就是一个很基本的ThreeJS的HelloWorld的代码，其中关于`Camera`等概念就不再赘述了，如果你对其中的概念感到疑惑，可以回过头去看看这篇文章[WebGL实战篇（十二）—— 工欲善其事，必先利其器 ThreeJS 介绍 - 掘金 (juejin.cn)](https://juejin.cn/post/7274826107904311332)，然后再回到这里。上述代码的运行结果如下：

![20231026180024_rec_](https://picbed-1255660905.cos.ap-chengdu.myqcloud.com/20231026180024_rec_.gif)



接下来我们就要对其进行改造了。我们的目标是将当前的渲染结果先渲染到 `RenderTarget`上，然后将 `RenderTarget`的纹理在渲染到其他的物体上面。



首先，我们需要一个 `RenderTarget`创建`RenderTarget`的方法很简单，直接 new 一个即可，我们需要告诉ThreeJS它的大小是多少。

```typescript
const rt = new WebGLRenderTarget(canvas.width, canvas.height);
```



我们再创建一个物体和材质，并将`RenderTarget`的纹理赋给它。



```typescript
const planeGeo = new PlaneGeometry(2, 2);
const planeMat = new MeshBasicMaterial({
        color: 0xffffff,
        map: rt.texture,
    });
const screenPlaneMesh = new Mesh(planeGeo, mat2);

scene.add(screenPlaneMesh);
```

注意上面的代码中，在 `planeMat`中的`map`属性，我们使用了 `rt.texture`。



接下来我们需要修改我们的渲染逻辑，在主循环`mainLoop`中：

我们需要先将场景中的物体渲染到 `RenderTarget`中，然后再单独渲染 `screenPlaneMesh`。

```typescript

    const mainLoop = () => {
        controls.update();
        renderer.setRenderTarget(rt);
        renderer.render(scene, mainCamera);
        requestAnimationFrame(mainLoop);
    };
```



按上述的代码修改后，再次运行。Oops，发现浏览器中报错了~

![image-20231026181758775](https://picbed-1255660905.cos.ap-chengdu.myqcloud.com/image-20231026181758775.png)

`[.WebGL-0x11804ad8f00] GL_INVALID_OPERATION: Feedback loop formed between Framebuffer and active Texture.`

大体的意思就是在渲染流程中形成了“循环”。造成原因大致如下：

因为在场景中的`screenPlaneMesh` 物体的材质 `planeMat`中使用了 `RenderTarget`，但是我们的渲染目标又是 `RenderTarget`。意思就是我要渲染后才能够使用 `rt.texture`。但是此次渲染的时候又使用了 `rt.texture`。这不就“死锁”了么？？？所以，我们在第一次渲染到 `RenderTarget`的时候，需要将 `screenPlaneMesh`排除出去。



所以，在真正渲染之前我们需要将 `screenPlaneMesh`的 visible属性设置为 `false`

```typescript

renderer.setRenderTarget(rt);
screenPlaneMesh.visible = false;
renderer.clear();
renderer.render(scene, mainCamera);
```

 

这是一种很方便的做法，但是它有着其局限性，比如在真正渲染到画布上时，如果我们仅仅只想渲染 `screenPlaneMesh`的话，还需要将其他的物体的 visible 设置为 `false`。下面介绍一种更加通用的物体分层方法



## 物体分层

将物体分为一个一个的“层”，这在很多渲染引擎里面都是很常见的做法。ThreeJS也不例外为我们提供了这样的一种机制，ThreeJS最多支持32层(0~31)。每个 `Object3D`对象上面都存在一个 `layers`的属性，对于摄像机和物体有这不同的用法

对于摄像机：

`camera.layers.enable / disable / toggle` 分别表示开启、禁用、切换可见/不可见。

对于场景的渲染物体：

`obj.layers.set `是将物体设置到某一层中，物体默认处于第0层。



所以我们需要将`screenPlaneMesh`单独置于一层，我们定义一个 `POST_LAYER`层，除此以外，我们还需要一个摄像机来渲染 `POST_LAYER`层中的物体：

```typescript
	const DEFAULT_LAYER = 0;
    const POST_LAYER = 1;
    const postCamera = mainCamera.clone();
    postCamera.position.z = 2;

	// 使 mainCamera 不可见 POST_LAYER层的物体
    mainCamera.layers.disable(POST_LAYER);
	
	// postCamera仅仅渲染 POST_LAYER中的物体
    postCamera.layers.disable(DEFAULT_LAYER);
    postCamera.layers.enable(POST_LAYER);

	// 将screenPlaneMesh 置于 POST_LAYER 层
    screenPlaneMesh.layers.set(POST_LAYER);
```

