# WebGL实战篇（十六）—— 实现镜面效果



<img src="https://picbed-1255660905.cos.ap-chengdu.myqcloud.com/doc/image-20240103181012791.png" alt="image-20240103181012791" style="zoom:33%;" />

# 前言

今天，我们来探索Three.js中的如何实现镜面效果。事实上，THREEJS官方已经给出了实现镜面效果的例子。详细可以参见[three.js examples (threejs.org)](https://threejs.org/examples/?q=ssr#webgl_postprocessing_ssr)。今天，我们从发掘代码本质的层面出发，来揭示一下镜面反射的本质。



# 何为镜面反射

众所周知，镜子中的像与我们本身的位置是相反的。比如，我举起我的右手，在镜子中举起的是“左手”。我这样说你可能觉得有点抽象，我们直接上镜子和相机实际拍两张照片来展示一下这个现象：

如下图，注意观察玩偶的蝴蝶结的方位。可以看到，在镜子中，玩偶的蝴蝶结在左边，而我直接在玩偶的正面拍一张照时，蝴蝶结则是在右边。说明镜子中的像与实际物体的方位是相反的，另外，在平面成像中，镜子中的物体与实际物体的大小是相等的。简单说就是：镜子中的物体与实际物体**大小相等，反向相反**。但是由于我们采用的是***透视摄像机***，所以你看到镜子中的像会比实际的物体要***小一些***。

<div style="display: flex;align-items: end;justify-content:space-around">
    <img src="https://picbed-1255660905.cos.ap-chengdu.myqcloud.com/doc/image-20240104110311993.png" alt="image-20240104110311993" style="zoom:50%;" />
    <img src="https://picbed-1255660905.cos.ap-chengdu.myqcloud.com/doc/image-20240104110326579.png" alt="image-20240104110326579" style="zoom:50%;" />
</div>





那么，我们在镜子中观察到的像到底等价于我们从哪里观察的呢？答案就是相当于我们在镜子背后相同的位置观察实际物体的**镜像**！



在上图中，我们在镜子中看到的玩偶形象相当于我从当前拍摄的位置出发，“绕到镜子”背后的位置，再对着玩偶拍摄一张照片，最后再进行一次镜像得到的照片，就是我们在镜子中看到的玩偶的样子。



![image-20240104135201975](https://picbed-1255660905.cos.ap-chengdu.myqcloud.com/doc/image-20240104135201975.png)

上图简要的说明了这一过程。值得注意的是**：我们并不是将相机进行了镜面对称，注意看相机的坐标轴。我们只是绕到了镜子的后面！**



所以设置这个绕到镜子后面的相机的位置至关重要！！！

# 代码实现

## 设置相机位置

我们现在实现一个函数来将一个相机**“放到镜子的后面”**

```ts
function setReflection(
    mainCamera: Camera,
    virtualCamera: Camera,
    reflector: Object3D
): void;
```

函数签名如上：

`mainCamera`表示真正拍摄物体的相机，`virtualCamera`则表示要***"放到镜子后面"***的相机，`reflector`则表示反射面物体。

我们最主要是需要将`virtualCamera`的坐标和姿态设置正确，所谓的姿态就是相机看向哪里，也就是节点的旋转的角度（四元数）。

我们现在来看一下具体的实现细节吧。

首先要设置正确的位置坐标。就是需要得到相机应该位于镜子后的哪个位置。`virtualCamera`的位置比较简单，它就是与真实的相机镜面对称的。其实就是一个求镜面对称坐标的问题。我们写一下代码



<img src="https://picbed-1255660905.cos.ap-chengdu.myqcloud.com/doc/image-20240104141607114.png" alt="image-20240104141607114" style="zoom:50%;" />

```typescript
const reflectorWorldPosition = new Vector3();
const cameraWorldPosition = new Vector3();

reflectorWorldPosition.setFromMatrixPosition(reflector.matrixWorld);
cameraWorldPosition.setFromMatrixPosition(mainCamera.matrixWorld);

const rotationMatrix = new Matrix4();
rotationMatrix.extractRotation(reflector.matrixWorld);

const normal = new Vector3();
normal.set(0, 0, 1);
normal.applyMatrix4(rotationMatrix);

const view = new Vector3();
view.subVectors(reflectorWorldPosition, cameraWorldPosition);

view.reflect(normal).negate();
view.add(reflectorWorldPosition);
```

我们先获取反射面物体和相机的世界坐标，可以通过`setFromMatrixPosition` 这个THREEJS提供的API来进行获取。

接着，获取反射面的世界坐标下的法线方向。先根据`extractRotation`API来获取反射面世界坐标下的旋转矩阵，再乘上反射面的法线坐标即可，*这里的由于我认为反射面是THREEJS中的`PlaneGeometry`，其法线方向为 (0, 0, 1)，所以这里先写死了，读者可自行更改。*



下面的`view` 表示的是最终的位置。先求得相机看向反射面位置的方向，再使用 `reflect` API 来求得反射后的方向，注意，反射后的方向并不是关于法线对称的。下图展示了 `reflect` API求得的反射方向。所以我们还需要使用`negate`来取反一次。

最后在加上`reflectorWorldPosition`就是镜面对称的位置啦。可能这里写 `view.add(reflectorWorldPosition)` 比较难以理解，由于向量加法的交换律，你可以看做是 `view = reflectorWorldPosition.add(view)`。就相当于是在 `reflectorWorldPosition`的位置，沿着反射后取反的方向移动了一段距离。这样是不是就好理解多了？

![image-20240104142514693](https://picbed-1255660905.cos.ap-chengdu.myqcloud.com/doc/image-20240104142514693.png)

接下来我们要求`virtualCamera`看向的方位了，这里提供一个思路：我们先求得原始相机看向的位置，比如沿着原始相机的-z方向移动一个单位，这个点就是我们原始相机看向的点，然后再将这个点进行一次对称，则我们就获得了`virtualCamera`看向的方向了，再设置正确的上方向，最后根据`lookAt` API来设置`virtualCamera`真正看向的方向即可。

上代码！



```typescript
// 求得原始相机看向的位置
const lookAtPosition = new Vector3();
// 这里不一定是 (0, 0, -1)，只要方向与-z轴方向一致即可，
// 也就是说 (0, 0, -2/-5/-10/...)都是正确的
lookAtPosition.set(0, 0, -1);
lookAtPosition.applyMatrix4(rotationMatrix);
lookAtPosition.add(cameraWorldPosition);

// 与上面求原始相机的镜像位置一样，求着原始相机看向位置的对称点
const target = new Vector3();
target.subVectors(reflectorWorldPosition, lookAtPosition);
target.reflect(normal).negate();
target.add(reflectorWorldPosition);

// 设置虚拟相机的位置
virtualCamera.position.copy(view);
// 设置虚拟相机的上方向，上方向一定要设置对！！！
// 上方向保证了后续我们使用 lookAt API时，计算的相机矩阵的正确性！！！
virtualCamera.up.set(0, 1, 0);
virtualCamera.up.applyMatrix4(rotationMatrix);
virtualCamera.up.reflect(normal);
virtualCamera.lookAt(target);
```

将上面的代码结合起来我们就得到了***将相机放到镜子后面***的函数。

我们在THREEJS中验证一下，我构建一个物体，并且将x,y,z轴都可视化出来。构建这个物体的代码如下：

```typescript

function buildVirtualCameraModel(): Object3D {
    const size = 0.05;
    const centerGeo = new BoxGeometry(0.2, 0.2, 0.2);
    const xGeo = new BoxGeometry(1, size, size);
    const coneGeo = new ConeGeometry(size * 1.8, size * 3.6);
    const yGeo = new BoxGeometry(size, 1, size);
    const zGeo = new BoxGeometry(size, size, 1);
    const mat = new MeshBasicMaterial({
        color: 0xcccccc,
    });
    const xMat = new MeshMatcapMaterial({
        color: 0xff0000,
    });
    const yMat = new MeshMatcapMaterial({
        color: 0x00ff00,
    });
    const zMat = new MeshMatcapMaterial({
        color: 0x0000ff,
    });
    const centerMesh = new Mesh(centerGeo, mat);
    const xMesh = new Mesh(xGeo, xMat);
    const xConeMesh = new Mesh(coneGeo, xMat);
    const yMesh = new Mesh(yGeo, yMat);
    const yConeMesh = new Mesh(coneGeo, yMat);
    const zMesh = new Mesh(zGeo, zMat);
    const zConeMesh = new Mesh(coneGeo, zMat);

    xMesh.position.x = 0.5;
    yMesh.position.y = 0.5;
    zMesh.position.z = 0.5;
    xConeMesh.position.x = 1.02;
    xConeMesh.rotateZ(-Math.PI / 2);
    yConeMesh.position.y = 1.02;
    zConeMesh.position.z = 1.02;
    zConeMesh.rotateX(Math.PI / 2);

    centerMesh.add(xMesh);
    centerMesh.add(xConeMesh);
    centerMesh.add(yConeMesh);
    centerMesh.add(zConeMesh);
    centerMesh.add(yMesh);
    centerMesh.add(zMesh);

    return centerMesh;
}
```



渲染的结果如下：

![image-20240104145408756](https://picbed-1255660905.cos.ap-chengdu.myqcloud.com/doc/image-20240104145408756.png)

画面的左边是原始物体（红色箭头表示X轴，绿色箭头为Y轴，蓝色箭头为Z轴），右边则是通过`setReflection `方法将相机放置到镜子后面的效果。



注意看左右两个坐标系的x轴方向，左边的X轴方向指向屏幕外，而右边的X轴方向则指向屏幕里面，***这正说明了将摄像机放到镜子后面不是简单的将摄像机进行镜像对称！！！***

## 渲染流程

接下来，我们就要开始进行渲染流程的改造了。先看一下初始场景：

![image-20240104151953506](https://picbed-1255660905.cos.ap-chengdu.myqcloud.com/doc/image-20240104151953506.png)

我们的场景很简单，就是一个立方体，再加上一个平面。我们希望将平面作为反射面，将立方体反射出来。

渲染流程很简单，如下。

<img src="https://picbed-1255660905.cos.ap-chengdu.myqcloud.com/doc/image-20240104152554328.png" alt="image-20240104152554328" style="zoom:50%;" />

代码如下：

```typescript
const mainLoop = () => {
        globalTime += 0.1;
        controls.update();
        setReflection2(mainCamera, refCamera, screenPlaneMesh);
        scene.background = new Color(0x777777);
        renderer.setRenderTarget(rt);
        screenPlaneMesh.visible = false;
        renderer.render(scene, refCamera);
        scene.background = null;
        renderer.setRenderTarget(null);
        screenPlaneMesh.visible = true;
        renderer.render(scene, mainCamera);
        requestAnimationFrame(mainLoop);
    };
```

另外，我们需要为反射面写一个shader来处理镜像的问题，其余部分与实现岸边泡沫效果的代码基本一致。

反射面的Shader如下：

```glsl
varying vec4 vScreenPos;
uniform sampler2D mainTex;
uniform float time;

void main () {
    vec3 screenPos = vScreenPos.xyz / vec3(vScreenPos.w);
    
    vec2 uv = screenPos.xy * 0.5 + 0.5;
    uv.x = 1.0 - uv.x;
    vec4 color = texture(mainTex, uv);
    // 这里为了让反射的效果明显一点，取了反色
    color.rgb = 1.0 - color.rgb;
    // 颜色空间转换
    color.rgb = pow(color.rgb, vec3(1. / 2.2));
    gl_FragColor = color;
}
```

## 结果

最终结果如下：

![20240104153230_rec_](https://picbed-1255660905.cos.ap-chengdu.myqcloud.com/doc/20240104153230_rec_.gif)

# 总结

今天的内容就这么多了，今天讲解了镜面反射的内容，我们了解到了我们从镜子中看到的物体等价于：从镜子背后相同的位置看向物体的镜像！！！重要的事情需要反复强调！！！这一句话可以说是本文的精髓了，一定要加深理解！！！其余的可以参考实现岸边泡沫的章节进行学习。不过今天实现的镜面反射效果还是比较粗糙的，主要是为了向大家解释镜面反射的原理，所以没有过多的考虑到其中的一些Bug。望读者自行修正。

