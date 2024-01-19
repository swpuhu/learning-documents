# WebGL实战篇（十七）—— PBR材质之直接光照

今天的话题是PBR材质，PBR材质的全称是 ***Physical Based Rendering*** 基于物理的渲染。之前正是看到了PBR材质在电脑上令人惊叹的表现才引起了我对于渲染的浓厚兴趣，时隔多年，我总算是把PBR材质学到了一点皮毛，特此写下此文来抒发一点我对于PBR材质的一点粗浅的见解，我会尽可能的将我理解的知识用浅显易懂的话语写出来，尽可能让读者看懂~如有错误，还恳请指正！



PBR是一个很复杂的话题，所以本文会分为几个部分来写。本文中可能会涉及一点点的数学公式，尤其是积分符号。不过我会用简单的话语来解释这些公式，但是公式背后的理论我不会深入的进行解释，尤其是涉及数学和物理的部分。我们需要了解的是整个渲染流程。



话不多说，Let's learn!



## 理论部分

可能你会在别的地方看到一个这样的公式，它被称作“渲染方程(Rendering Equation)”，这是由世界上某些很聪明的家伙想出来的，你可能会感到很困惑，也可能会让你感到畏难。接下来，让我尝试为你解答这个方程的含义，你不需要记住这个复杂的公式，你需要记住的仅仅是它表示的含义。
$$
L_o(p,\omega_o) = \int_{\mathclap{\Omega}}{f_r(p, \omega_i, \omega_o)}{L_i(p,\omega_i)}{n \cdot \omega_i}d\omega_i
$$
先解释一下等式的左边 $L_o(p,\omega_o)$，它表示在某点$p$，出射光线$\omega_o$的***辐照度***。害，我尽可能少的引入新的名词，但是这里确实要引入这个概念了，因为PBR是基于物理的。不过我们可以***暂时可以将其理解成在这一点上我们最终着色的颜色吧***。



现在来到了等式的右边$\int_{\mathclap{\Omega}}$ ，很多人一看到积分符号就懵圈了，甚至原地就放弃。不过我想说，呀咩得！！！积分符号没有神秘的，不过就是加法罢了。$\int_{\mathclap{\Omega}}$的含义就是在 $\Omega$范围内进行积分，而在渲染方程中，$\Omega$表示的通常是一个半球区域。意思就是我们在一个半球区域内将所有的入射光线计算${f_r(p, \omega_i, \omega_o)}{L_i(p,\omega_i)}{n \cdot \omega_i}$ 的值，然后让这个区域中的所有结果加起来。

![img](https://picbed-1255660905.cos.ap-chengdu.myqcloud.com/doc/ibl_hemisphere_sample.png)



如上图所示，对于每一根入射光线，都根据公式${f_r(p, \omega_i, \omega_o)}{L_i(p,\omega_i)}{n \cdot \omega_i}$计算其结果，最后将结果进行相加。



接下来，我们介绍一下积分公式中每一项的含义吧。

我们先从简单的开始：

1. $n \cdot \omega_i$ 这个点积是否看起来有点眼熟？我们在Blinn-Phong模型中使用过。辐射率受到入射光线与平面法线间的夹角$\theta$余弦值$\cos \theta$的影响。当直接辐射到平面上的程度越低时，光线就越弱，而当光线完全垂直于平面时强度最高。这和我们在前面的[基础光照](https://learnopengl-cn.github.io/02 Lighting/02 Basic Lighting/)教程中对于漫反射光照的概念相似，其中$\cos \theta$就直接对应于光线的方向向量和平面法向量的点积$n \cdot \omega_i$

2. $L_i(p,\omega_i)$则是表示在$p$点，入射光线$\omega_i$的辐照度，我们可以理解为是这一点的光线强度。

3. 最后这个${f_r(p, \omega_i, \omega_o)}$就有点厉害了，它表示**BRDF**项，**BRDF**是***Bidi-Reflect Direction Function***，***双向反射分布函数***。BRDF可以近似的求出每束光线对一个给定了材质属性的平面上最终反射出来的光线所作出的贡献程度。举例来说，如果一个平面拥有完全光滑的表面（比如镜面），那么对于所有的入射光线$\omega_i$（除了一束以外）而言BRDF函数都会返回0.0 ，只有一束与出射光线$\omega_o$拥有相同（被反射）角度的光线会得到1.0这个返回值。

上面所说的关于BRDF的内容你可能会觉得有点抽象，那么让我们简单一点：

你可以将BRDF理解成是一个函数，这个函数有许多不同的实现版本，而目前最常用的一个版本是 ***Cook-Torrance*** 模型。
$$
f_r = k_d\frac{c}{\pi} + k_sf_{cook-torrance}
$$

$$
f_{cook-torrance} = \frac{DFG}{4(\omega_o\cdot n)(\omega_i) \cdot n}
$$



根据上述理论，我们可以编写一些伪代码：

```typescript
function getNextLightDir(index: number): vec3;

function fr(p: vec3, wi: vec3, wo: vec3): vec3;

function L(p: vec3, wi: vec3): vec3;

let sum = 0;
let p: vec3;
let wo: vec3;
let n: vec3;
let dw = 1.0 / rayNums;
for (let i = 0; i < rayNums; i++) {
    const wi = getNextLightDir(i);
    sum += Fr(p, wi, wo) * L(p, wi) * dot(n, wi) * dw;
}

```



## Cook-Torrance模型

所以，接下来我们的重点计算这个$f_{cook-torrance}$上面，让我们再次回顾它的“样子”。
$$
f_{cook-torrance} = \frac{DFG}{4(\omega_o\cdot n)(\omega_i) \cdot n}
$$

- $\omega_o$：出射光线方向
- $\omega_i$：入射光线方向

- $n$：法线方向

上面的这三个参数很好理解，重点在于分子上面的 D、F、G。接下来我们就来好好说道说道这三个东西是何方神圣



D、F、G这三个字母分表表示一种类型的函数：

- D：Normal <span style="font-weight:bold;color:red">D</span>istribution Function **法线分布函数**

- G：<span style="font-weight:bold;color:red">G</span>eometry Function **几何函数**
- F： <span style="font-weight:bold;color:red">F</span>resnel Function **菲涅尔方程**



我们一个个来看：

### 法线分布函数

这个函数的作用是根据物体表面的粗糙度，对法线方向进行不同程度的扰动。一个平面越是粗糙，这个平面上的法线发了就会混乱，这会导致反射光线更趋向于向完全不同的方向发散开来，而平面越是光滑，则反射光线则更去向与同一个方向。

![img](https://picbed-1255660905.cos.ap-chengdu.myqcloud.com/doc/microfacets_light_rays.png)

这里我们直接给出一个现成的公式，本文不会去深究其中的数学道理，如果你对此有兴趣的话，你可以自行搜索相关的资料。

我们要使用的 ***Trowbridge-Reitz GGX***:
$$
NDF_{GGXTR}(n, h, \alpha) = \frac{\alpha^2}{\pi((n\cdot h^2)(\alpha^2 - 1) + 1)^2}
$$
其中，$h$表示的是半程向量（观察方向和入射光线方向相加后再归一化）

使用GLSL代码编写的Trowbridge-Reitz GGX法线分布函数是下面这个样子的：

```glsl
float D_GGX_TR(vec3 N, vec3 H, float a)
{
    float a2     = a*a;
    float NdotH  = max(dot(N, H), 0.0);
    float NdotH2 = NdotH*NdotH;

    float nom    = a2;
    float denom  = (NdotH2 * (a2 - 1.0) + 1.0);
    denom        = PI * denom * denom;

    return nom / denom;
}
```

### 几何函数

几何函数的作用是为了描述物体微平面上的“自遮挡”的效果，因为物体的表面实际上是凹凸不平的（即便是非常光滑的物体，在微观上来讲都存在凹凸不平），这种自遮挡会消耗光线的能量。

![img](https://picbed-1255660905.cos.ap-chengdu.myqcloud.com/doc/geometry_shadowing.png)

我们还是直接给出公式与代码：
$$
G_{SchlickGGX}(n,v,k) = \frac{n \cdot v}{(n \cdot v)(1 - k) + k}
$$
其中$k$是 $\alpha$的重映射，取决于我们要用的是针对直接光照还是针对IBL光照（IBL的内容后续提到，此处就使用直接光照即可）的几何函数:
$$
k_{direct}=\frac{(\alpha + 1)^2}{8}
$$


为了有效的估算几何部分，需要将观察方向（***几何遮蔽(Geometry Obstruction)***）和光线方向向量（***几何阴影(Geometry Shadowing)***）都考虑进去。我们可以使用***史密斯法(Smith’s method)***来把两者都纳入其中：

代码如下：

```glsl
float GeometrySchlickGGX(float NdotV, float k)
{
    float nom   = NdotV;
    float denom = NdotV * (1.0 - k) + k;

    return nom / denom;
}

float GeometrySmith(vec3 N, vec3 V, vec3 L, float k)
{
    float NdotV = max(dot(N, V), 0.0);
    float NdotL = max(dot(N, L), 0.0);
    float ggx1 = GeometrySchlickGGX(NdotV, k);
    float ggx2 = GeometrySchlickGGX(NdotL, k);

    return ggx1 * ggx2;
}
```

### 菲涅尔方程

菲涅尔（发音为Freh-nel）方程描述的是被反射的光线对比光线被折射的部分所占的比率，这个比率会随着我们观察的角度不同而不同。

当垂直观察的时候，任何物体或者材质表面都有一个***基础反射率(Base Reflectivity)***，但是如果以一定的角度往平面上看的时候所有反光都会变得明显起来。你可以自己尝试一下，用垂直的视角观察你自己的木制/金属桌面，此时一定只有最基本的反射性。但是如果你从近乎90度（是指和物体表面法线的夹角）的角度观察的话反光就会变得明显的多。如果从理想的90度视角观察，所有的平面理论上来说都能完全的反射光线。这种现象因菲涅尔而闻名，并体现在了菲涅尔方程之中。

![img](https://picbed-1255660905.cos.ap-chengdu.myqcloud.com/doc/fresnel.png)

与之前一样，我们直接给出菲涅尔方程的近似公式与代码：
$$
F_{Schlick}(h, v, F_0) = F_0 + (1 - F_0)(1 - (h \cdot v))^5
$$
$F_0$表示平面的基础反射率。



```glsl
vec3 fresnelSchlick(float cosTheta, vec3 F0)
{
    return F0 + (1.0 - F0) * pow(1.0 - cosTheta, 5.0);
}
```



# 编码

接下来我们开始进行编码工作，与以往类似，我们先构建场景，这次我们选择构建7x7个球体，在横轴方向上它们的粗糙度逐渐增加，在纵轴方向上金属度逐渐减少。另外，我们再添加4个光源。场景构建的代码如下：

## 构建场景

```typescript
function generateSphereGrid(scene: Scene, mesh: Mesh): void {
    const rows = 7;
    const cols = 7;
    const spacing = 2.5;
    for (let y = 0; y < rows; y++) {
        const metallic = clamp(y / rows, 0.05, 1.0);
        for (let x = 0; x < cols; x++) {
            const m = mesh.clone();
            if (mesh.material instanceof ShaderMaterial) {
                m.material = mesh.material.clone();
                (m.material as ShaderMaterial).uniforms.roughness.value = clamp(
                    x / cols,
                    0.05,
                    1.0
                );
                (m.material as ShaderMaterial).uniforms.metallic.value =
                    metallic;
            }
            const posX = (x - Math.floor(cols / 2)) * spacing;
            const posY = (y - Math.floor(rows / 2)) * spacing;

            m.position.x = posX;
            m.position.y = posY;
            scene.add(m);
        }
    }
}

const scene = new Scene();

const fov = 45;
const near = 0.1;
const far = 1000;
const aspect = canvas.width / canvas.height;
const mainCamera = new PerspectiveCamera(fov, aspect, near, far);
mainCamera.position.z = 3;
const viewPosition = new THREE.Vector3(-11.56, 7.839, 20.215);
const viewQuat = new Quaternion(-0.156, -0.253, -0.041, 0.953);

const sphereGeo = new SphereGeometry(1);
sphereGeo.computeTangents();
const customMat = new ShaderMaterial({
    vertexShader: vertGlsl,
    fragmentShader: fragGlsl,
    defines: {
        USE_TANGENT: true,
    },
    uniforms: {
        albedo: {
            value: [0.5, 0.0, 0.0],
        },
        metallic: {
            value: 0,
        },
        roughness: {
            value: 0.1,
        },
        ao: {
            value: 1,
        },
        pointLights: {
            value: [
                {
                    position: [-10.0, 10.0, 10.0],
                    color: [300.0, 300.0, 300.0],
                },
                {
                    position: [10.0, 10.0, 10.0],
                    color: [300.0, 300.0, 300.0],
                },
                {
                    position: [-10.0, -10.0, 10.0],
                    color: [300.0, 300.0, 300.0],
                },
                {
                    position: [10.0, -10.0, 10.0],
                    color: [300.0, 300.0, 300.0],
                },
            ],
        },
    },
});

const sphereMesh = new Mesh(sphereGeo, customMat);
generateSphereGrid(scene, sphereMesh);
```

然后往场景中添加4个点光源，***注意***，这里我们必须真的往场景中添加几个点光源，否则在shader中获取不到点光源。即便我们已经在uniform中设置了4个点光源的数据。而且，在uniform中，***点光源的名称必须叫做 `pointLights`***

```typescript
const light1 = new THREE.PointLight(0xff0040, 400);

scene.add(light1.clone());
scene.add(light1.clone());
scene.add(light1.clone());
```



## Shader代码

下面是shader代码

### 顶点着色器

```glsl
varying vec3 vNormal;
varying vec2 vUv;
varying vec3 vWorldPosition;
void main () {
    vUv = uv;
    vec3 worldNormal = normalize ( mat3( modelMatrix[0].xyz, modelMatrix[1].xyz, modelMatrix[2].xyz ) * normal );
    vNormal = worldNormal;

    vec4 mvPosition = vec4(position, 1.0);
    mvPosition = modelViewMatrix * mvPosition;

    vec4 worldPosition = ( modelMatrix * vec4( position, 1.0 ) );
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
}
```



### 片段着色器

```glsl
#include <common>
#include <lights_pars_begin>
vec3 fresnelSchlick(float cosTheta, vec3 F0)
{
    return F0 + (1.0 - F0) * pow(clamp(1.0 - cosTheta, 0.0, 1.0), 5.0);
}
float DistributionGGX(vec3 N, vec3 H, float roughness)
{
    float a      = roughness*roughness;
    float a2     = a*a;
    float NdotH  = max(dot(N, H), 0.0);
    float NdotH2 = NdotH*NdotH;

    float num   = a2;
    float denom = (NdotH2 * (a2 - 1.0) + 1.0);
    denom = PI * denom * denom;

    return num / denom;
}

float GeometrySchlickGGX(float NdotV, float roughness)
{
    float r = (roughness + 1.0);
    float k = (r*r) / 8.0;

    float num   = NdotV;
    float denom = NdotV * (1.0 - k) + k;

    return num / denom;
}
float GeometrySmith(vec3 N, vec3 V, vec3 L, float roughness)
{
    float NdotV = max(dot(N, V), 0.0);
    float NdotL = max(dot(N, L), 0.0);
    float ggx2  = GeometrySchlickGGX(NdotV, roughness);
    float ggx1  = GeometrySchlickGGX(NdotL, roughness);

    return ggx1 * ggx2;
}

varying vec3 vNormal;
varying vec2 vUv;
varying vec3 vWorldPosition;
uniform vec3  albedo;
uniform float metallic;
uniform float roughness;
uniform float ao;


void main () {
    vec3 N = normalize(vNormal);
    vec3 V = normalize(cameraPosition - vWorldPosition);
    vec3 F0 = vec3(0.04);
    F0 = mix(F0, albedo, metallic);
    vec3 Lo = vec3(0.0);

    vec3 WorldPos = vWorldPosition;
    PointLight pointLight;
    for ( int i = 0; i < 4; i ++ ) {

        pointLight = pointLights[ i ];

        // calculate per-light radiance
        vec3 L = normalize(pointLight.position - WorldPos);
        vec3 H = normalize(V + L);
        float distance    = length(pointLight.position - WorldPos);
        float attenuation = 1.0 / (distance * distance);
        vec3 radiance     = pointLight.color * attenuation;

        // cook-torrance brdf
        float NDF = DistributionGGX(N, H, roughness);
        float G   = GeometrySmith(N, V, L, roughness);
        vec3 F    = fresnelSchlick(max(dot(H, V), 0.0), F0);

        vec3 kS = F;
        vec3 kD = vec3(1.0) - kS;
        kD *= 1.0 - metallic;

        vec3 nominator    = NDF * G * F;
        float denominator = 4.0 * max(dot(N, V), 0.0) * max(dot(N, L), 0.0) + 0.001;
        vec3 specular     = nominator / denominator;

        // add to outgoing radiance Lo
        float NdotL = max(dot(N, L), 0.0);
        Lo += (kD * albedo / PI + specular) * radiance * NdotL;
        // Lo += N;

    }
    vec3 ambient = vec3(0.03) * albedo * ao;
    vec3 color = ambient + Lo;

    color = color / (color + vec3(1.0));
    color = pow(color, vec3(1.0/2.2));
    gl_FragColor = vec4(color, 1.0);
}
```

注意，我们引入了 ThreeJS提供的shader片段：`#include <common>`, `#include <lights_pars_begin>`。

shader中的pointLights是一个数组，该数组中的点光源是一个结构体，其结构如下：

```glsl
struct PointLight {
    vec3 position;
    vec3 color;
    float distance;
    float decay;
};
```

上面的结构体已经包含在 THREEJS提供的 `<lights_pars_begin>`中了，不要再重复定义了哟~



再稍微提一下上面代码的最后几行：
```glsl
color = color / (color + vec3(1.0));
color = pow(color, vec3(1.0/2.2));
```

由于我们的PBR材质是基于辐照度进行计算的，辐照度的范围通常都会超过1，这明显不在我们的渲染范围内了，所以我们需要将其压缩到0~1之间，而`color = color / (color + vec3(1.0));`则是一种常见的方式，在很多地方也将其称为**HDR**(High Dynamic Range)到**LDR**(Low Dynamic Range)的转换。



而后面的`color = pow(color, vec3(1.0/2.2));`则是进行了伽马校正，关于这方面的知识读者可以自行查询。



以上就是我们实现PBR直接光照的核心代码了，全部完整的代码及实例请参考这里：[Three-PBR-direct - 码上掘金 (juejin.cn)](https://code.juejin.cn/pen/7325389918245486633)



# 总结

今天我们学习了在直接光照条件下渲染PBR材质，本文没有深入的介绍PBR的相关理论，只是展示了他是如何工作的，我们需要理解的就是渲染方程表示的真正含义。而渲染方程中最影响渲染结果的就是BRDF项，我们还介绍了 Cook-Torrance 模型，其中的D、F、G对最后的渲染起到了决定性的作用。



接下来，我们会继续学习PBR材质关于环境光照的部分。
