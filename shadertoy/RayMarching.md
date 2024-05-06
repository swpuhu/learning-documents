# 光线步进（Ray Marching）

# 前言

今天我们介绍另一种在shadertoy中构建3D图形的方法，这种方法叫做“光线步进”或者叫“Ray Marching”，这是一种极其常见的方法。接下来我们就简单扼要的介绍一下这种方法。



通常，使用光线步进技术会搭配SDF技术一同进行，所谓的SDF就是指**有向距离函数**（*Signed Distance Function*） 或 **有向距离场**（*Signed Distance Field*）。这是一种描述图形的方法，它指的距离图形边缘的最小距离，如果在图形内部，则距离为**负数**，若在图形外部，则距离为**正数**。

<img src="https://picbed-1255660905.cos.ap-chengdu.myqcloud.com/doc/image-20240428151023953.png" alt="image-20240428151023953" style="zoom:33%;" />

假设我们已经构建好了一个SDF函数 `sdf(vec3 p)`，我们通过传入一个位置`p`，可以得到该点距离场景中其他物体的最小距离。那么我们的光线步进算法如下：

<img src="https://picbed-1255660905.cos.ap-chengdu.myqcloud.com/doc/image-20240428152954999.png" alt="image-20240428152954999" style="zoom:33%;" />

如上图所示，我们从视线的源点`ro`出发，沿着视线方向`rd`出发，此时我们通过SDF函数求得源点距离场景中的物体的距离为s1。那么我们就沿着`rd`方向移动s1距离的长度，在该点再根据SDF函数求得距离物体的距离s2，再沿着`rd`方向前进s2距离的长度，依次类推，直到我们求得离场景中物体的距离小于某个阈值为止！



所以，根据此理论，我们可以写出下面的代码：

```glsl
float GetDist(vec3 p) {
    float sphereDist = length(p - vec3(0.0, 1.0, 6.0)) - 1.0;
    float planeDist = p.y;

    return min(sphereDist, planeDist);
}

float RayMarching(vec3 ro, vec3 rd) {
    float d0 = 0.;
    for(int i = 0; i < MAX_STEPS; i++) {
        vec3 p = ro + d0 * rd;
        float dS = GetDist(p);
        d0 += dS;
        if(dS < SURFACE_DIST || d0 > MAX_DIST) {
            break;
        }
    }
    return d0;
}
```

在上述的代码中`GetDist`，是我们的SDF函数，该函数描述了一个球体位于`vec3(0, 1, 6)`的位置，其半径为1.0，和一个处于原点的平面物体。他们距离点`p`的距离分别是`sphereDist`与`planeDist`，我们可以使用`min`函数求其**并集**，这是一个相当常见的操作。

使用`min`函数可以求两个SDF函数的并集，使用`max`函数则是求SDF 函数的交集（两物体相交）。



现在我们尝试将RayMarching技术应用到上一篇文章中的框架中吧，在上一篇文章中，我们讲述了如何设置摄像机。代码如下：

```glsl

mat3 GetCameraMat(vec3 ro, vec3 ta, vec3 up) {
    vec3 f = normalize(ta - ro);
    vec3 r = cross(up, f);
    vec3 u = normalize(cross(f, r));
    return mat3(r, u, f);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {

    vec2 uv = (fragCoord.xy - 0.5 * iResolution.xy) / iResolution.y;

    float t = iGlobalTime;

    vec3 ro = vec3(0, 1., 0.);

    vec3 col = vec3(0.0);
    vec3 target = vec3(0.0, 1.0, 6.0);
    vec3 rd = GetCameraMat(ro, target, vec3(0., 1., 0.)) * vec3(uv, 1.);

    float d = RayMarching(ro, rd);
    col = vec3(d / 6.0);
    fragColor = vec4(col, 1.0);
}
```

此时的效果如下：

<img src="https://picbed-1255660905.cos.ap-chengdu.myqcloud.com/doc/image-20240428172225423.png" alt="image-20240428172225423" style="zoom:33%;" />



我们根据`RayMarching`函数求得场景中物体与原点之间的距离，我们也很容易求得与物体的交点。交点为`vec3 p = ro + rd * d`



# 一种简单的光照模型

接下来，我们介绍一种简单的光照模型为我们的场景进行着色。我们将采用Phong光照模型的漫反射项为其着色，并且为场景添加阴影。



让我们回忆一下Phong光照模型的漫反射项是如何计算的？
$$
diffuse = Light \cdot Normal * DiffuseColor
$$
光源的方向和漫反射颜色我们可以人为的设定，现在唯一差的变量就是法线方向了。那我们如何计算点`p`的法线方向呢？我们可以发现，法线其实就是“梯度”梯度就是指函数下降的最快的方向。根据高中函数知识：
$$
\nabla f (p) = \lbrace \frac{df(p)}{dx}, \frac{df(p)}{dy}, \frac{df(p)}{dz}\rbrace
$$

$$
\frac{df(p)}{dx} \approx \frac{f(p) - f(p - \lbrace h, 0, 0\rbrace)}{h}
$$

根据上面的公式，我们可以写出下面求解法线方向的代码：

```glsl
vec3 GetNormal(vec3 p) {
    const float eps = 0.001;
    const vec2 h = vec2(eps, 0);
    float d = GetDist(p);
    return normalize(d - vec3(GetDist(p - h.xyy), GetDist(p - h.yxy), GetDist(p - h.yyx)));
}

```



接下来让我们验证一下我们的代码，结果如下

```glsl
	float d = RayMarching(ro, rd);
	vec3 p = ro + d * rd;
	vec3 n = GetNormal(p);
    col = vec3(n);
    fragColor = vec4(col, 1.0);
```

<img src="https://picbed-1255660905.cos.ap-chengdu.myqcloud.com/doc/image-20240428181704947.png" alt="image-20240428181704947" style="zoom:33%;" />

可以看到我们已经计算出了场景的法线。有了法线，那么我们可以很方便的计算出漫反射光照了，可以写出下面的代码：

```glsl
float GetLight(vec3 p) {
    vec3 lightPos = vec3(0, 5, 6);
    vec3 l = normalize(lightPos - p);
    vec3 n = GetNormal(p);
    float dif = max(dot(n, l), 0.);
    return dif;
}
```

渲染结果如下：

<img src="https://picbed-1255660905.cos.ap-chengdu.myqcloud.com/doc/image-20240428182105527.png" alt="image-20240428182105527" style="zoom:33%;" />

## 阴影

现在我们已经完成了3D场景的漫反射光照部分，接下来我们可以计算一下物体的阴影。在光栅化的方法中要计算物体的阴影是相对比较麻烦的事情，但是好的消息是，在RayMarching体系下，计算物体的阴影是很容易的方式！！！

<img src="https://picbed-1255660905.cos.ap-chengdu.myqcloud.com/doc/image-20240428183222170.png" alt="image-20240428183222170" style="zoom:33%;" />

我们从点`p`出发，向光源方向发射一条射线，我们利用 `RayMarching`方法可以得到沿光源方向射线移动的距离，如果这个距离比光源到点`p`的距离要小，我们则认为从点`p`出发无法触达光源，换言之，该点应该处于阴影之中！！！根据此理论，我们可以写出下面的代码

```glsl
float GetLight(vec3 p) {
    vec3 lightPos = vec3(0, 5, 6);
    // lightPos.xz += vec2(sin(iTime), cos(iTime)) * 2.0;
    vec3 l = normalize(lightPos - p);
    vec3 n = GetNormal(p);
    float dif = max(dot(n, l), 0.);

    float d = RayMarching(p, l);
    if(d < length(lightPos - p)) {
        dif *= .1;
    }
    return dif;
}
```

效果如下：

<img src="https://picbed-1255660905.cos.ap-chengdu.myqcloud.com/doc/image-20240428183443612.png" alt="image-20240428183443612" style="zoom:33%;" />

我们可以看到怎么画面几乎都变成黑色了？注意`float d = RayMarching(p, l);`这一条代码，我们是从点p出发，但是点p已经是物体上的点了，所以根据`RayMarching`函数判断，在起点处就已经与物体相交了，所以我们需要将p先偏移一段距离，这里，我们将点p沿着法线方向偏移一段距离，修改上述代码的第8行为：`float d = RayMarching(p + 0.01 * n, l);`效果如下：

<img src="https://picbed-1255660905.cos.ap-chengdu.myqcloud.com/doc/image-20240428183650526.png" alt="image-20240428183650526" style="zoom:33%;" />

这下效果终于正常了！

最后，我们简单的让光源移动起来，让场景更加灵动一点。

最终的代码如下：



# 总结

今天，我们学习了光线步进（RayMarching）与SDF相结合的方法来构建3D场景。这是一种非常常见，也是非常重要的方法，在ShaderToy中，你能见到的绝大多数3DShader都是采用的此种方法进行创建的。此外，RayMarching在计算物体阴影方面也有着得天独厚的优势。这一点，想必你已经在上面的代码中有所体会了。接下来我们还会介绍更多关于RayMarching的妙用，敬请期待！