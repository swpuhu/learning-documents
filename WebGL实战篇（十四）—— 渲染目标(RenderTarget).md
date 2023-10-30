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



接着我们修改一下主循环中渲染流程

第一次渲染时，我们将结果绘制到`RenderTarget`上面，并且设置场景的背景色为 `0xff6600`这是为了将前后两次渲染的结果更好的区分开来。



第二次渲染时，我们将结果真正的绘制到canvas画布上面，所以要使用`renderer.setRenderTarget(null)`

```typescript
const mainLoop = () => {
    controls.update();

    renderer.setRenderTarget(rt);
    renderer.clear();
    scene.background = new Color(0xff6600);
    renderer.render(scene, mainCamera);

    renderer.setRenderTarget(null);

    scene.background = new Color(0xcccccc);
    renderer.render(scene, postCamera);

    requestAnimationFrame(mainLoop);
};

```

 最后的结果如下：

![image-20231027103225633](https://picbed-1255660905.cos.ap-chengdu.myqcloud.com/image-20231027103225633.png)

我们简单解释一下这个图像是如何形成的：

第一次渲染时，渲染了一个立方体到场景中，场景中的背景色是 `0xff6600`，也就是橘红色。

![image-20231027103404208](https://picbed-1255660905.cos.ap-chengdu.myqcloud.com/image-20231027103404208.png)

第二次渲染时，仅仅只渲染`screenPlaneMesh`，也就是一个平面。我们将第一次渲染的结果作为纹理贴到这个平面上，形成了下面的结果：

![image-20231027103510325](https://picbed-1255660905.cos.ap-chengdu.myqcloud.com/image-20231027103510325.png)

由于这个平面没有占据整个屏幕空间，所以你可以看到橘红色的背景旁边留有灰色的背景。



你可能注意到前后两次渲染的结果存在一定的色差，这是因为两次渲染输出的颜色空间不一致导致的，这一部分的内容不在今天的讨论范围之内，我们先略过。



## 渲染结果变形

现在还有另一个问题需要我们处理，由于画布的尺寸与我们第二次渲染的物体的尺寸不一致导致渲染的内容有一些变形，我们需要做一些处理。如何处理这个问题有很多解决办法，今天我们介绍一种让第二次渲染的结果与原来重合的方式。

<img src="https://picbed-1255660905.cos.ap-chengdu.myqcloud.com/20231027104604.png" style="zoom: 33%;" />

在上面的图中显示出了画布边缘的坐标位置。如果要让图像不变形，那么我需要让“平面”（橘红色区域）的uv坐标与原始图像对应起来。

我们可以直接使用顶点着色器最后计算出来的坐标（NDC坐标）。然后再将其映射到 0 ~ 1的范围，最后进行采样。



我这样说起来可能比较抽象，我们还是废话不多说，直接上代码吧！

以下是顶点着色器的代码：

```glsl
varying vec4 vScreenPos;
void main () {
    vec4 mvPosition = vec4(position, 1.0);
    mvPosition = modelViewMatrix * mvPosition;
    vScreenPos = projectionMatrix * mvPosition;
    gl_Position = vScreenPos;
}
```

顶点着色器的代码还是很好懂的，我们声明了一个 `vScreenPos`的变量，它代表了顶点在NDC空间的位置，`varying`修饰符表示需要在光栅化阶段对其进行插值，我们后续可以在片段着色器中使用。

下面是片段着色器的代码：

```glsl
varying vec4 vScreenPos;
uniform sampler2D mainTex;
uniform sampler2D noiseTex;
uniform float time;

void main () {
    vec3 screenPos = vScreenPos.xyz / vec3(vScreenPos.w);
    // 将坐标从 -1 ~ 1映射到 0 ~ 1 
    vec2 uv = screenPos.xy * 0.5 + 0.5;
    // 纹理采样
    vec4 color = texture(mainTex, uv);
    color.rgb = pow(color.rgb, vec3(1. / 2.2));
    gl_FragColor = color;
}
```



由于我们使用了自定义的着色器代码，所以材质也需要修改为：

```typescript
	const screenMat = new ShaderMaterial({
        vertexShader: screenVert,
        fragmentShader: screenFrag,
        depthTest: false,
        uniforms: {
            mainTex: {
                value: rt.texture,
            },
        },
    });
    const screenPlaneMesh = new Mesh(planeGeo, screenMat);
```



最后的结果如下：

![image-20231027105342386](https://picbed-1255660905.cos.ap-chengdu.myqcloud.com/image-20231027105342386.png)

对比上面的图，我们不难发现，我们的立方体已经不再“变形”。

OK，通过上面的一系列的操作，我们相当于具备了“**抓取屏幕空间内容**”的能力。并且可以只**渲染部分内容**。那么我们就实现一个立方体的部分热浪效果吧~



# 热浪效果

我们实现下面这样的一个“热浪效果”，并且只给立方体的一部分应用。我们可以看到在下图中，只有背景为橘红色的那一半立方体有被热浪扭曲的效果。

![20231027105907_rec_](https://picbed-1255660905.cos.ap-chengdu.myqcloud.com/20231027105907_rec_.gif)



这是如何实现的呢？很简单，首先我们要利用上面我们搭建好的抓取屏幕空间内容的代码框架，然后引入一张噪声图，再对噪声图进行采样，将原始的uv坐标加上一个噪声就可以实现这样的一个效果了。噪声图如下：

![noise_a](https://picbed-1255660905.cos.ap-chengdu.myqcloud.com/noise_a.jpg)

我们修改片段着色器中的代码：

```glsl
varying vec4 vScreenPos;
uniform sampler2D mainTex;
uniform sampler2D noiseTex;
// 新引入一个全局时间，用于修改uv坐标
uniform float time;

void main () {
    vec3 screenPos = vScreenPos.xyz / vec3(vScreenPos.w);
    // 乘1.5 和 加 time * 0.02 是属于参数，这里偷懒了。
    vec2 noiseUv = screenPos.xy * 1.5 + time * 0.02;
	
    // 将noiseUv 从 -1~1 转换到 0 ~ 1 区间
    noiseUv = noiseUv * 0.5 + 0.5;
    // 对纹理进行采样，将噪声的值从 0 ~ 1 转换到 -1 ~ 1
    vec2 noise = texture(noiseTex, noiseUv).rr * 2.0 - 1.0;
    
    vec2 uv = screenPos.xy * 0.5 + 0.5;

    // 利用噪声对原始的 uv 坐标进行干扰
    uv += noise * 0.02;
    vec4 color = texture(mainTex, uv);
    
    // 进行颜色空间转换，此处略过
    color.rgb = pow(color.rgb, vec3(1. / 2.2));
    gl_FragColor = color;
}
```



代码中的关键部分已在代码的注释中注明，请仔细参阅。

我们还需要修改材质中的参数以及主循环的代码

```typescript

    const screenMat = new ShaderMaterial({
        vertexShader: screenVert,
        fragmentShader: screenFrag,
        depthTest: false,
        uniforms: {
            mainTex: {
                value: rt.texture,
            },
            noiseTex: {
                value: noiseTex,
            },
            time: {
                value: 1,
            },
        },
    });
	// 为了让效果更明显一点，把平面往右边移动1个单位长度
	screenPlaneMesh.position.set(1, 0, 0);
	let globalTime = 0.0;
	
	// 该语句也同样十分重要，我们需要在主循环中手动控制什么时候清除颜色缓冲，什么时候清除深度缓冲
    renderer.autoClear = false;
    const mainLoop = () => {
        // 为了让画面动起来，所以需要引入一个全局时间
        globalTime += 0.1;
        screenMat.uniforms.time.value = globalTime;

        controls.update();

        renderer.setRenderTarget(rt);
        // 设置背景相当于清除了颜色缓冲区
        scene.background = new Color(0xff6600);
        renderer.clear();
        renderer.render(scene, mainCamera);

        renderer.setRenderTarget(null);
        scene.background = new Color(0xcccccc);

        renderer.render(scene, mainCamera);
		
        // 设置背景颜色设置为null 等同于不清除颜色缓冲区
        scene.background = null;
        renderer.render(scene, postCamera);

        requestAnimationFrame(mainLoop);
    };
```



以上就是全部的内容了，我们可以利用 spector.js来查看是如何绘制的：



![image-20231027111209367](https://picbed-1255660905.cos.ap-chengdu.myqcloud.com/image-20231027111209367.png)

![](https://picbed-1255660905.cos.ap-chengdu.myqcloud.com/image-20231027111219795.png)

![image-20231027111237471](https://picbed-1255660905.cos.ap-chengdu.myqcloud.com/image-20231027111237471.png)

第一张图中下面的文字“WebGLFramebuffer” 可以理解为是绘制到 `RenderTarget`上的内容。



# 总结

总结一下今天所学的知识吧~

`RenderTarget`如果要用一句话来概括的话，我认为它就是一张离屏的canvas画布。后续我们可以将这张画布作为纹理使用。

另外，我们还学习了将屏幕空间的内容映射到物体上且保证它不变形，并且实现了一个热浪扭曲的效果。限于作者的文笔水平有限，可能讲的比较抽象，还望读者结合代码实际操练一番。下面是完整demo示例：

