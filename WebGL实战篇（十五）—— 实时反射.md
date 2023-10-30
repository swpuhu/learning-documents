# WebGL实战篇（十五）—— 利用深度图实现岸边泡沫效果



![20231030-144430](https://picbed-1255660905.cos.ap-chengdu.myqcloud.com/doc/20231030-144430.gif)

# 前言

今天我们要学习的是深度图相关的知识。深度图是渲染中相当重要的一个手段，我们可以利用深度做出各种各样的效果。今天这篇文章将会介绍使用深度图的一些关键细节，以及我们会利用深度图做一个岸边泡沫的效果（如封面图）。废话不多说，直接开干！



# 深度图介绍

## 什么是深度图

深度图（Depth Map）是计算机图形中的一种重要概念，它通常用于记录场景中各个点到摄像机的距离信息。深度图在多个图形渲染技术和图形效果中起到关键作用。

深度图中的每个像素（或纹理坐标）包含一个深度值，表示从观察者（通常是摄像机）到场景中物体的距离。深度值通常以**非线性**形式表示，通常是归一化的，范围在0.0（最近处）到1.0（最远处）之间。



上面所说的**非线性**非常的关键！！！我们回顾一下关于MVP变换的知识，我们将一个坐标映射到NDC空间时，我们需要进行相应的转换。其变换矩阵为：


$$
\begin{bmatrix}
\frac{\cot \frac{fov}{2}}{Aspect} & 0 & 0 & 0 \\
0 &  \cot \frac{fov}{2} & 0 & 0 \\
0 & 0 & -\frac{d_n + d_f}{d_f - d_n} & -\frac{2d_nd_f}{d_f - d_n} \\
0 & 0 & -1 & 0
\end{bmatrix}
$$
任意一个点与该矩阵相乘的结果为：
$$
假设：\textbf {c} = \cot{\frac{fov}{2}} \\

\begin{bmatrix}
\frac{\textbf {c}}{Aspect} & 0 & 0 & 0 \\
0 &  \textbf {c} & 0 & 0 \\
0 & 0 & -\frac{d_n + d_f}{d_f - d_n} & -\frac{2d_nd_f}{d_f - d_n} \\
0 & 0 & -1 & 0
\end{bmatrix} 
\begin{bmatrix}
x \\ y \\ z \\ 1
\end{bmatrix} = \begin{bmatrix}
\frac{\textbf {c}}{Aspect}  \\
\textbf cy \\
-\frac{d_n + d_f}{d_f - d_n}z -\frac{2d_nd_f}{d_f - d_n} \\
-z
\end{bmatrix}
$$
所以
$$
\textbf z_{ndc} = -\frac{d_n + d_f}{d_f - d_n}\textbf z_{view} -\frac{2d_nd_f}{d_f - d_n}
$$
上图展示了相机空间下的深度值转换到NDC空间后的深度值。（下图中的蓝色线）可以看出其关系是非线性的，深度值在前半段就很快的增加，在后半段其深度值增加的很缓慢。



在相机空间中的深度值比较小的时候，深度的变化比较大，而在相机空间中的深度值较大时，其变化的又很缓慢，这样会造成很严重的精度问题。



![image-20231030154447829](https://picbed-1255660905.cos.ap-chengdu.myqcloud.com/doc/image-20231030154447829.png)



大家要先对这个结论有一个认识。后续的内容我们还会基于这一点进行展开。我们先进行下面的步骤。



## 生成深度图

深度图是用像素点的颜色值表示其深度，那么我们该如何生成一张深度图呢？

我们需要利用[WebGL实战篇（十四）—— 渲染目标(RenderTarget) - 掘金 (juejin.cn)](https://juejin.cn/post/7294230559248908299)这篇文章中的知识，我们需要将需要写入深度图中的物体都渲染到一个 `RenderTarget` 中，且需要使用渲染深度图的Shader。渲染深度图的Shader很简单。



**顶点着色器：**

```glsl
varying vec4 vScreenPos;
void main () {
    vec4 mvPosition = vec4(position, 1.0);
    mvPosition = modelViewMatrix * mvPosition;
    vScreenPos = projectionMatrix * mvPosition;
    gl_Position = vScreenPos;
}
```



**片段着色器：**

```glsl
varying vec4 vScreenPos;

void main () {
    float z = vScreenPos.z / vScreenPos.w;
    gl_FragColor = vec4(z);
}
```



上面就是直接写入了NDC空间的`z`坐标的值。我们可以看一下最后的结果：可以看出场景中处于白茫茫的一片，这就是因为深度值在NDC空间中是非线性导致的，在深度值比较大的时候其变换较小。

![screenshot-20231030-120026](https://picbed-1255660905.cos.ap-chengdu.myqcloud.com/doc/screenshot-20231030-120026.png)

我们拉进摄像机可以看出场景中的深度值变化：

![screenshot-20231030-120034](https://picbed-1255660905.cos.ap-chengdu.myqcloud.com/doc/screenshot-20231030-120034.png)

我们隐隐约约的能够看到场景中间有一个立方体。



为了解决深度值在非线性空间中导致的精度问题，我们需要将深度值转换回线性空间，也就是从 NDC 空间再转换回相机空间中。我们已经知道了 
$$
\textbf z_{ndc} = -\frac{d_n + d_f}{d_f - d_n}\textbf z_{view} -\frac{2d_nd_f}{d_f - d_n}
$$
我们可以通过其逆运算得出：
$$
\textbf z_{view} = \frac{2fn}{\textbf z_{ndc} \cdot (f - n) - (f + n)}
$$
由于 $\textbf z_{view}$是负数，为了方便起见，我们将其转换为正数，在除以 $f - n$可以将其转化到 0~1区间内。


$$
\textbf z_{01} = \frac{-\textbf z_{view} - n}{f - n}
$$
我们修改片段着色器的内容如下：

```glsl
varying vec4 vScreenPos;
float zNDCToZ01(float zNDC) {
    float zView = (2.0 * uFar * uNear) / (zNDC * (uFar - uNear) - (uFar + uNear));
    float z01 = (zView + uNear) / (uFar - uNear);
    return -z01;
}

void main () {
    float z = vScreenPos.z / vScreenPos.w;
    float z01 = zNDCToZ01(z);
    gl_FragColor = vec4(vec3(z01), 1.0);
}
```

其结果如下：

![image-20231030164547930](https://picbed-1255660905.cos.ap-chengdu.myqcloud.com/doc/202310301645186.png)

如果你的深度变化不是很明显，你可以尝试将far的值修改的小一些来获取更明显的效果。



但是即便如此，我们的深度图还是存在着明显的精度问题，一张RGBA格式的纹理每个像素点可以存储4个8位的数字，一共是32位的精度，但是我们现目前只使用了一个通道来存储深度，这是极大的浪费！！！



所以，为了最大限度的保存精度，我们需要将4个通道都存入精度值。我们可以使用THREEJS提供的 `packing`系列辅助函数。THREEJS提供了 `packDepthToRGBA` 与 `unpackRGBAToDepth` 这两个函数，这两个函数一般是成对使用的，前者是将深度值编码为RGBA值，后者则是将RGBA 值还原为深度值。



要使用这两个函数，我们需要在着色器的代码里面进行引入，使用 `#include `语法。



```glsl
#include <packing>

void main () {
    // ....略过
    gl_FragColor = packDepthToRGBA(z01);
}
```

![image-20231030165419511](https://picbed-1255660905.cos.ap-chengdu.myqcloud.com/doc/202310301654678.png)

最后渲染出来的深度图看起来有点怪异，但是不用担心，这是正常的。仅仅只是看起来怪异，因为我们对深度值进行了编码。



# 利用深度图制作岸边泡沫效果

我们现在已经学会了如何生成一张深度图，现在我们利用这张深度图来制作一些有趣的效果吧。一个典型的应用场景就是利用深度图来制作一个岸边的水波的泡沫效果了（如封面图）。其原理如下：

![image-20231030170701631](https://picbed-1255660905.cos.ap-chengdu.myqcloud.com/doc/202310301707802.png)

如上图所示，红色的物体是深度图中渲染的物体，其深度值被记录在深度图中。而蓝色线则表示之前没有在深度图中渲染的物体，那么在渲染蓝色物体时，就可以知道它深度图中其他物体的深度值的差距。我们利用这个深度差可以做一些事。



为了渲染岸边泡沫的效果，我们需要新建一个着色器，我将其命名为 `water.frag.glsl`

其代码如下：



```glsl
varying vec2 vZW;
varying vec4 vScreenPos;
varying vec2 vUv;
uniform float uFar;
uniform float uNear;
uniform sampler2D depthTex;
uniform sampler2D noiseTex;
uniform float uTime;

#include <packing>
float zNDCToZView(float zNDC) {
    float zView = (2.0 * uFar * uNear) / (zNDC * (uFar - uNear) - (uFar + uNear));
    return -zView;
}

void main () {
    float z = vZW.x / vZW.y;
    float depth = zNDCToZView(z);

    vec3 screenPos = vScreenPos.xyz / vScreenPos.w;
    screenPos = screenPos * 0.5 + 0.5;
	
    // 深度图中的深度值，范围为 0 ~ 1
    float depthSample = unpackRGBAToDepth(texture(depthTex, screenPos.xy));
    
    // 转换到相机空间中 near ~ far
    float sceneDepth = depthSample * (uFar - uNear) + uNear;

    // 计算其深度差
    float diff =  sceneDepth - depth;
    
    // 将深度差归一化到 0 ~ 0.8的范围。
    float waterDiff01 = clamp(diff / 0.8, 0.0, 1.0);

    vec3 depthColor = vec3(0.0, 0.0, 0.5);
    vec3 shallowColor = vec3(0.0, 0.8, 1.0);
	
    // 根据深度值来混合浅水区域与深水区域的颜色
    vec3 waterColor = mix(shallowColor, depthColor, waterDiff01);
    gl_FragColor = vec4(waterColor, 1.0);
}

```



为了使深度图与当前场景中的图像对齐，我们依然使用了基于NDC坐标转换为UV坐标的手法。（第21~22行代码）



接着我们读取了深度图中的深度值（范围0~1），我们将其转换到相机空间中 (near ~ far)。在计算当前物体在相机空间中的深度值，与其做比较。我们再根据深度值赋予其不同的颜色。结果如下：

![image-20231030172102318](https://picbed-1255660905.cos.ap-chengdu.myqcloud.com/doc/202310301721502.png)



现在我们可以往其中添加泡沫的效果了。

出现泡沫的原理很简单，我们引入一张噪声图（如下图），读取当前噪声图的颜色值，并设定一个阈值，大于该阈值则设置一个颜色，小于该阈值则舍弃。

![](https://picbed-1255660905.cos.ap-chengdu.myqcloud.com/noise_a.jpg)

修改着色器代码如下：

```glsl

    vec2 noiseUV = vUv * vec2(3.0, 2.0) + uTime * 0.02;
    float noise = texture(noiseTex, noiseUV).r;

    float noiseCutoff = 0.8;
    float surfaceNoise = noise > noiseCutoff ? 1.0 : 0.0;

    vec3 foamColor = vec3(1.0) * surfaceNoise;

    vec3 color = waterColor + foamColor;
    gl_FragColor = vec4(color, 1.0);
```



结果如下：

![20231030172356_rec_](https://picbed-1255660905.cos.ap-chengdu.myqcloud.com/doc/20231030172356_rec_.gif)

现在我们已经成功的添加了泡沫了，但是我们的“岸边”还没有泡沫，我们需要将这个**阈值**与我们的深度差值联系起来，由于我们的`diff`值范围为 0~1之间，所以我们可以将 `diff`与 `noiseCutoff`相乘起来，靠近岸边的地方 `diff`值越小，则 `noiseCutoff`也越小。产生的泡沫也就越多。为了和岸边的水深效果区分开，我们使用一个 `foamDiff01`来表示泡沫有效的深度范围。

所以我们修改代码：

```glsl
    float foamDiff01 = clamp(diff / 0.3, 0.0, 1.0);

	float noiseCutoff = 0.8;
    noiseCutoff *= foamDiff01;

    float surfaceNoise = noise > noiseCutoff ? 1.0 : 0.0;
```



其结果就与封面图的效果一模一样了。

![20231030-144430](https://picbed-1255660905.cos.ap-chengdu.myqcloud.com/doc/20231030-144430.gif)



渲染流程此处不再讲解，请参考最后的代码。



# 总结

让我们来回顾一下本文涉及的知识点：

1. NDC空间的深度是**非线性**的，所以我们在保存深度图时需要将其转换到线性空间中（相机空间，再转换到0~1）
2. 深度转到线性空间依然不够，还需要充分利用RGBA 4个通道来提高深度图的精度，利用THREEJS提供的 `<packing>`包。
3. 利用当前渲染物体的深度与深度图中的深度差可以做一些事情。



最后是本文涉及的相关代码：

