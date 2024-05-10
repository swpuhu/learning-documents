# Shader赏析——大珠小珠落玉盘

# 前言

今天，为大家带来的内容是Shader赏析——大珠小珠落玉盘。赏析赏析，正如其字面意思，首先，我们先欣赏一下其画面吧~



这幅画面可谓是精美绝伦，我看到其的一瞬，我就联想到了琵琶行中的著名词句：嘈嘈切切错杂弹，大珠小珠落玉盘。（此处应有叮叮咚咚的bgm，笑）

从技术上讲，这是一个典型的3D场景的Shader，其中运用的知识主要是**相机的设置**、**光线与几何体相交**、**光照计算**、**弹跳**以及一些基本的随机（哈希）函数等，接下来，让我们深入的对其源代码进行剖析。



# 代码分析

## 主函数

分析一篇源代码的时候，我们需要先厘清其主要的脉络，剔除那些花里胡哨的东西。我首先将主函数`mainImage`中的代码简化如下：

```glsl
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord.xy / iResolution.xy) - 0.5;
    uv.y *= iResolution.y / iResolution.x;

    time = iTime * 0.2;
    vec3 pos = vec3(0., 1.0, -10.);

    CameraSetup(uv, pos, vec3(0.), 0.5);

    fragColor = Stars(cam.ray);
    fragColor += Ground(cam.ray);
    fragColor.a = 1.0;
}
```



前2行代码是经典的将uv坐标归一化的操作。此时uv坐标的范围是-0.5~0.5之间。

第5行计算全局变量`time`的值，用于动画效果，如果不计算`time`，那么画面将退化为静止图片。

第8行计算摄像机的位置，详细的计算方式，可以参考我们前面的文章【占位】

第10行计算每个弹跳小球的位置及颜色。

第11行计算地板的光照



此Shader中设置相机部分的代码我们今天就略过了，如果还有读者对其不熟悉，可以参考此【占位】文章最主要的部分就在`Stars`于 `Ground`这两部分函数中了。现在让我们进入其中一探究竟！



## Stars函数

该函数如下：

```glsl
vec4 Stars(ray r) {
    vec4 col = vec4(0.);

    float s = 0.;
    for(int i = 0; i < NUM_STARS; i++) {
        s++;
        col += Star(r, Noise101(s));
    }

    return col;
}
```

该函数看起来也是一个比较简单的循环，`NUM_STARS`是一个宏，**因为在GLSL低版本中不允许在循环中使用变量作为判断条件**。所以此处使用了宏来代替变量

`Noise101`表示接受1个浮点数作为参数，产生另一个随机的浮点数输出。我们看一下其实现：

```glsl
float Noise101(float x) {
    return fract(sin(x) * 5346.1764);
}
```

该函数实际上并没有特定的实现方式，只要你能保证你产生的数是随机的就行，你可以将函数中的常数`53467.1764`改成任意的值，这取决于你的喜好，其中的`sin(x)`也可以变为`cos`函数等，甚至也不一定是用`fract`函数包裹。这只是为了方便我们控制其输出值的范围和后续计算罢了。



我们需要关注的重点在于for循环中的 `Star`函数。

### Star函数

```glsl
vec4 Star(ray r, float seed) {
    vec4 noise = Noise4(vec4(seed, seed + 1., seed + 2., seed + 3.));

    float t = fract(time * 0.1 + seed) * 2.;

    float fade = smoothstep(2., 0.5, t);		// fade out;
    vec4 col = mix(COOLCOLOR, HOTCOLOR, fade); // vary color with size
    float size = STARSIZE + seed * 0.03;					// random variation in size
    size *= fade;

    float b = BounceNorm(t, 0.4 + seed * 0.1) * 7.;
    b += size;

    vec3 sparkPos = vec3(noise.x * 10., b, noise.y * 10.);
    vec3 closestPoint = ClosestPoint(r, sparkPos);

    float dist = DistSqr(closestPoint, sparkPos) / (size * size);
    float brightness = 1. / dist;
    col *= brightness;

    return col;
}
```

该函数接受2个参数，参数1是`ray`类型，参数2是一个浮点数`seed`表示随机种子，随机种子的不同会生成不同的随机数。首先我们根据`Noise4`函数来产生另一个4维向量，其实现原理与`Noise101`类似。我们可以使用该函数来产生随机的位置。



第4行，为每一个Star都设置了不同的时间轴，这样看起来更加的自然，否则每个星星都会从相同的位置落下，看起来就比较怪异。读者可以自行将第4行修改为`float t = fract(time)`试试看是什么效果。



第6行的作用是为了设置可见范围，从第4行代码可以看出，`t`的范围是0~2之间，则`smoothstep(2., 0.5, t)`表示的含义为：当t < 0.5时，星星为完全可见状态，t处于0.5~2之间时，则开始渐隐，时间大于2时，则完全不可见。

<img src="https://picbed-1255660905.cos.ap-chengdu.myqcloud.com/doc/image-20240506130651972.png" alt="image-20240506130651972" style="zoom:50%;" />

第7~9行则是根据`fade`变量来设置星星的参数，比如大小`size`，颜色`col`。

第11~12行是计算当前星星的位置，因为我们的星星是有弹跳效果的，我们通过`BounceNormal`函数来计算当前星星的高度，该函数的原理我们在下面进行讲解。

第14行则是设置了星星的位置，这个不多说

第15~17行计算当前相机发出的射线距离此位置最近的距离。我们简单的阐述一下其原理



<img src="https://picbed-1255660905.cos.ap-chengdu.myqcloud.com/doc/image-20240506132124486.png" alt="image-20240506132124486" style="zoom:50%;" />

如上图所示，从相机发出一条射线`ray r`，其原点为`r.o`，我们需要计算射线上距离点`p`最近的点，该点相当于经过点`p`向射线`r`作垂线。我们可以先计算出`r.o`到点`p`形成的向量到射线`r`上的投影的距离`proj`，再沿着射线的方向`r.d`行进`proj`的长度，即为该点。代码如下：

```glsl
vec3 ClosestPoint(ray r, vec3 p) {
    // returns the closest point on ray r to point p
    return r.o + max(0., dot(p - r.o, r.d)) * r.d;
}
```

`max(0, dot(p - r.o), r.d)`就是计算的投影长度`proj`，再从`r.o`出发，沿着`r.d`的方向前行`proj`的距离即可求得该点。



后续则是根据距离计算此像素点的亮度，最终返回其值。



## BounceNormal

接下来，我们阐述一下`BounceNormal`的具体原理。`BounceNormal`函数接受2个参数，

- `float t`表示时间，时间需要经过归一化处理，0表示小球开始落下的起点，1表示小球终止弹跳的重点。`
- `float decay`表示每次弹跳后，小球衰减的高度，其值为0~1之间

我们先摆出代码：

```glsl
float BounceNorm(float t, float decay) {
    float height = 1.;
    float heights[NUM_ARCS];
    heights[0] = 1.;
    float halfDurations[NUM_ARCS];
    halfDurations[0] = 1.;
    float halfDuration = 0.0;
    for(int i = 1; i < NUM_ARCS; i++) {			// calculate the heights and durations of each bounc
        height *= decay;
        heights[i] = height;
        halfDurations[i] = sqrt(height);
        halfDuration += halfDurations[i];
    }
    t *= halfDuration * 2. + halfDurations[0];						// normalize time

    float y = 1. - t * t;

    for(int i = 1; i < NUM_ARCS; i++) {
        t -= halfDurations[i - 1] + halfDurations[i];
        y = max(y, heights[i] - t * t);
    }

    return saturate(y);
}
```

代码中的 `NUM_ARCS`也是一个宏，`NUM_ARCS === NUM_BOUNCE + 1`，`NUM_BOUNCE`表示小球弹跳的总次数，为什么要加1呢？且看后面的分析。

代码的2~7行都是在进行初始化的工作，heights[0]表示小球的初始高度是1。 halfDurations[0] = 1.表示初始下落需要1s的时间，为了方便起见我们姑且在这里将时间单位称呼为”秒(s)“。

第8~13行，是进行预计算，预计算每次弹跳后的高度和所需要花费的时间。假设小球反弹3次，`decay = 0.8`那么其中的数组的值分别是：

|               | 0    | 1      | 2      | 3      |
| ------------- | ---- | ------ | ------ | ------ |
| Heights       | 1    | 0.8    | 0.64   | 0.512  |
| HaflDurations | 1    | 0.8944 | 0.8    | 0.7155 |
| 累加时间      | 0    | 0.8944 | 1.6944 | 2.4099 |



其弹跳过程可视化如下：

![image-20240506142233180](https://picbed-1255660905.cos.ap-chengdu.myqcloud.com/doc/image-20240506142233180.png)

容我解释一下for循环中各个变量的含义

`height`表示每次弹跳时的最大高度，decay是一个衰减因子，每次弹跳后都需要用`height`乘以`decay`

`halfDurations`**数组**则表示每次弹跳所花费时间的一半，为什么是`sqrt(height)`来计算，你可以理解为是根据自由下落公式$t = \sqrt{\frac{2h}{g}}$ 得来，只不过去掉了常数项2与`g`。

`halfDuration`，注意，这里不是数组的`halfDurations`！！！编程需要一点视力！！！我们在for循环中每次都累加这个时间，是为了方便后面计算弹跳一共花了多少时间！！！！



循环结束后，第14行紧接着就计算了弹跳一共花了多少时间，由于第一次下落只下落了一半，所以我们的`halfDuration`的初始值为0，在后面讲其他弹跳次数花费的时间乘以2了之后再把第一次弹跳的时间加上。这个细节值得我们注意。然后再将其与时间`t`相乘，假设弹跳花费的总时间为`T`，那么这行代码则是将`t`从 0~1的区间，变换到了0~T的区间范围了。



第18行后的for循环则是根据时间t来计算，分别计算每个区间中，t对应的高度值并求其最大值。

第19行可能理解起来比较费劲，还是以上方的弹跳可视化过程为例，我们可以将这4次弹跳过程看成是4个函数。



![image-20240506144313142](https://picbed-1255660905.cos.ap-chengdu.myqcloud.com/doc/image-20240506144313142.png)

假设，我们现在求第1次反弹后小球的位置，也就是图中黑色曲线的函数。`t -=halfDurations[i - 1] + halfDurations[i]`的意思就是将黑色的这段函数**向左**移动`halfDurations[i - 1] + halfDurations[i]`的距离，这样，我们可以方便的通过`y = max(y, heights[i] - t * t);`求其值！ 此处的代码请读者细细体会。



最后返回时使用了`saturate`函数，该函数的作用是将值限定在0~1的范围内，类似于固定参数的`clamp`函数。



## Ground

最后，就是Ground函数了，在该函数中，我们依然是使用了for循环来计算每个星星对于当前像素点的光照贡献。为了简单我们只计算漫反射光照即可了。代码如下：

```glsl
vec4 Ground(ray r) {
    vec4 ground = vec4(0.);

    if(r.d.y > 0.)
        return ground;

    vec3 I = IntersectPlane(r);		// eye-ray ground intersection point

    for(int i = 0; i < NUM_STARS; i++) {
        vec4 star = CalcStarPos(i);

        vec3 L = star.xyz - I;
        float dist = length(L);
        L /= dist;

        float lambert = saturate(dot(L, up));
        float light = lambert / pow(dist, 1.);

        vec4 col = mix(COOLCOLOR, MIDCOLOR, star.w); // vary color with size
        vec4 diffuseLight = vec4(light) * 0.1 * col;

        ground += diffuseLight;
    }

    return ground;
}
```



该函数已经假设了地板的位置位于`vec3(0, 0, 0)`，法线方向为`vec3(0, 1, 0)`。

第7行求解了射线与地板的交点`I`

随后，使用一个for循环计算所有星星对该地板的光照贡献。**注意其中 `CalcStarPos`的计算逻辑应与`Star`函数中的计算逻辑保持一致**！

光照模型我们则使用了 `lambert`光照模型。（可以参考此文章）



# 总结

至此，该shader的重要函数基本就告一段落了。文中可能涉及到未介绍到的代码，如果你扔对此有疑惑，请在评论区留下你的问题。

该shader中比较复杂的部分当属小球弹跳的逻辑了，其余的知识应该在之前的文章中都有所涉及，如果你已经遗忘了相关的知识，可以及时回顾这些历史文章。
