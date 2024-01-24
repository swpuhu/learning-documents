# WebGL实战篇（十九）—— IBL之镜面反射

# 前言

接上节，在上节中，我们学习了IBL中漫反射的部分，但是要展现PBR材质的威力，还得加上最重要的一环，就是IBL的镜面反射。



# 理论

我们还是将渲染方程先搬出来。
$$
L_o(p,\omega_o) = \int_{\mathclap{\Omega}}{(k_d\frac{c}{\pi})}{L_i(p,\omega_i)}{n \cdot \omega_i}d\omega_i + \int_{\mathclap{\Omega}}{(k_sf_{cook-torrance})}{L_i(p,\omega_i)}{n \cdot \omega_i}d\omega_i
$$
不过，这次略有不同的是，我们不再关注漫反射的部分，而是转向到镜面反射的部分了，也就是下面这部分
$$
\int_{\mathclap{\Omega}}{(k_sf_{cook-torrance})}{L_i(p,\omega_i)}{n \cdot \omega_i}d\omega_i
$$
由于与辐照度卷积相同的（性能）原因，我们无法以合理的性能实时求解积分的镜面反射部分。因此，我们最好预计算这个积分，以得到像镜面 IBL 贴图这样的东西，用片段的法线对这张图采样并计算。但是，有一个地方有点棘手：我们能够预计算辐照度图，是因为其积分仅依赖于$\omega_i$，并且可以将漫反射反射率常数项移出积分，但这一次，积分不仅仅取决于$\omega_i$，从 BRDF 可以看出，我们还依赖于出射光线的方向$\omega_o$。
$$
f_{cook-torrance} = \frac{DFG}{4(\omega_o\cdot n)(\omega_i) \cdot n}
$$
由于性能的限制，在实时状态下，要求解$\omega_i$与$\omega_o$的组合的积分是不可行的。所有聪明的数学家们又经过一系列的大胆假设，认为上面镜面反射的积分近似的等于下面这个式子：
$$
L_o(p,\omega_o) =\int_{\Omega}{L_i(p,\omega_i)}d\omega_i * \int_{\Omega} {(k_sf_{cook-torrance})}{n \cdot \omega_i}d\omega_i
$$


**接下来，由于涉及的理论过于复杂，我要跳过这些理论，注意，我要开始加速了。**

我们看卷积的第一部分，也就是
$$
\int_{\Omega}{L_i(p,\omega_i)}d\omega_i
$$
它类似于我们在IBL漫反射光照中得到的辐照度图，只不过这次我们考虑粗糙度，针对不同的粗糙度，我们生成多张辐照图，最后的结果类似于这样：

![img](https://picbed-1255660905.cos.ap-chengdu.myqcloud.com/doc/ibl_prefilter_map.png)

因为随着粗糙度的增加，参与环境贴图卷积的采样向量会更分散，导致反射更模糊，所以对于卷积的每个粗糙度级别，我们将按顺序把模糊后的结果存储在预滤波贴图的 mipmap 中。



接下来看卷积的第二部分，也就是：
$$
\int_{\Omega} {(k_sf_{cook-torrance})}{n \cdot \omega_i}d\omega_i
$$
这是镜面反射积分的BRDF部分，根据BRDF函数的不同，我们得到的是不同的预计算结果，最终的结果类似于这样的一张图：

![img](https://picbed-1255660905.cos.ap-chengdu.myqcloud.com/doc/ibl_brdf_lut.png)

我们会在最终的计算镜面反射部分用到上面预计算的这两张图。接下来，我们就看一下在THREEJS中是如何实现PBR材质的吧~



## 编码

首先，我们先对卷积的第一部分进行预计算，也就是渲染一个具有mipmap的辐照图。有过一定WebGL开发经验的同学可能知道，我们可以通过 `generateMipmaps`这个API，来自动生成mipmap，但是在这里明显不适用，我们需要手动的为mipmap每一层的图像手动的进行渲染，我们才能精准的控制其结果。好在THREEJS为我们提供了一个方便的形式。



## 预计算辐照图

首先，我们在new出`WebGLCubeRenderTarget`的时候，我们需要传入一些参数，之前我们只是传入了纹理的大小，而这里我们需要加入一些别的选项。

再使用一个`CubeCamera`来捕捉不同mipmap层级下6个面的图像。

```typescript
const preFilterMipmapRT = new THREE.WebGLCubeRenderTarget(prefilterRTSize, {
    magFilter: THREE.LinearFilter,
    minFilter: THREE.LinearMipMapLinearFilter,
    generateMipmaps: false,
    type: THREE.HalfFloatType,
    format: THREE.RGBAFormat,
    colorSpace: THREE.LinearSRGBColorSpace,
    depthBuffer: false,
});
const mipLevels = Math.log2(prefilterRTSize) + 1.0;

for (let i = 0; i < mipLevels; i++) {
    preFilterMipmapRT.texture.mipmaps.push({});
}

const preFilterCam: THREE.CubeCamera = new THREE.CubeCamera(
    near,
    far,
    preFilterMipmapRT
);
```

我们再创建一个场景专门来渲染这个“辐照图”。

```typescript
const prefilterCustomBg = new CustomBackground(
    cubeMapVert,
    prefilterFrag,
    'prefilterBg'
);
const renderIrradianceCubeScene = new THREE.Scene();
const prefilterScene = new THREE.Scene();
prefilterScene.add(prefilterCustomBg.mesh);
```

我们上面用到的 `prefilterFrag`这个片段着色器的代码这里直接给出，其中的具体原理就不再讲述了，对此有兴趣的读者可以自行查询资料。

```glsl
varying vec3 vWorldPosition;
varying vec3 vWorldDirection;
uniform samplerCube envMap;
uniform float roughness;

const float PI = 3.14159265359;
// ----------------------------------------------------------------------------
float DistributionGGX(vec3 N, vec3 H, float roughness) {
    float a = roughness * roughness;
    float a2 = a * a;
    float NdotH = max(dot(N, H), 0.0);
    float NdotH2 = NdotH * NdotH;

    float nom = a2;
    float denom = (NdotH2 * (a2 - 1.0) + 1.0);
    denom = PI * denom * denom;

    return nom / denom;
}
// ----------------------------------------------------------------------------
// http://holger.dammertz.org/stuff/notes_HammersleyOnHemisphere.html
// efficient VanDerCorpus calculation.
float RadicalInverse_VdC(uint bits) {
    bits = (bits << 16u) | (bits >> 16u);
    bits = ((bits & 0x55555555u) << 1u) | ((bits & 0xAAAAAAAAu) >> 1u);
    bits = ((bits & 0x33333333u) << 2u) | ((bits & 0xCCCCCCCCu) >> 2u);
    bits = ((bits & 0x0F0F0F0Fu) << 4u) | ((bits & 0xF0F0F0F0u) >> 4u);
    bits = ((bits & 0x00FF00FFu) << 8u) | ((bits & 0xFF00FF00u) >> 8u);
    return float(bits) * 2.3283064365386963e-10; // / 0x100000000
}
// ----------------------------------------------------------------------------
vec2 Hammersley(uint i, uint N) {
    return vec2(float(i) / float(N), RadicalInverse_VdC(i));
}
// ----------------------------------------------------------------------------
vec3 ImportanceSampleGGX(vec2 Xi, vec3 N, float roughness) {
    float a = roughness * roughness;

    float phi = 2.0 * PI * Xi.x;
    float cosTheta = sqrt((1.0 - Xi.y) / (1.0 + (a * a - 1.0) * Xi.y));
    float sinTheta = sqrt(1.0 - cosTheta * cosTheta);

	// from spherical coordinates to cartesian coordinates - halfway vector
    vec3 H;
    H.x = cos(phi) * sinTheta;
    H.y = sin(phi) * sinTheta;
    H.z = cosTheta;

	// from tangent-space H vector to world-space sample vector
    vec3 up = abs(N.z) < 0.999 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);
    vec3 tangent = normalize(cross(up, N));
    vec3 bitangent = cross(N, tangent);

    vec3 sampleVec = tangent * H.x + bitangent * H.y + N * H.z;
    return normalize(sampleVec);
}
// ----------------------------------------------------------------------------
void main() {
    vec3 N = normalize(vWorldPosition);

    // make the simplifying assumption that V equals R equals the normal 
    vec3 R = N;
    vec3 V = R;

    const uint SAMPLE_COUNT = 1024u;
    vec3 prefilteredColor = vec3(0.0);
    float totalWeight = 0.0;

    for(uint i = 0u; i < SAMPLE_COUNT; ++i) {
        // generates a sample vector that's biased towards the preferred alignment direction (importance sampling).
        vec2 Xi = Hammersley(i, SAMPLE_COUNT);
        vec3 H = ImportanceSampleGGX(Xi, N, roughness);
        vec3 L = normalize(2.0 * dot(V, H) * H - V);

        float NdotL = max(dot(N, L), 0.0);
        if(NdotL > 0.0) {
            // sample from the environment's mip level based on roughness/pdf
            float D = DistributionGGX(N, H, roughness);
            float NdotH = max(dot(N, H), 0.0);
            float HdotV = max(dot(H, V), 0.0);
            float pdf = D * NdotH / (4.0 * HdotV) + 0.0001;

            float resolution = 512.0; // resolution of source cubemap (per face)
            float saTexel = 4.0 * PI / (6.0 * resolution * resolution);
            float saSample = 1.0 / (float(SAMPLE_COUNT) * pdf + 0.0001);

            float mipLevel = roughness == 0.0 ? 0.0 : 0.5 * log2(saSample / saTexel);

            prefilteredColor += textureLod(envMap, L, mipLevel).rgb * NdotL;
            totalWeight += NdotL;
        }
    }
    prefilteredColor = prefilteredColor / totalWeight;

    gl_FragColor = vec4(prefilteredColor, 1.0);
}
```

我们现在来渲染一下这个用于环境光镜面反射辐照图。

```typescript
const renderEnvMap = () => {
    const prefilterCustomBg = new CustomBackground(
        cubeMapVert,
        prefilterFrag,
        'prefilterBg'
    );
    const prefilterScene = new THREE.Scene();
    prefilterScene.add(prefilterCustomBg.mesh);

    tempCubeRT.fromEquirectangularTexture(renderer, hdrTexture);

    prefilterCustomBg.setCubeTexture(tempCubeRT.texture);
    for (let mipmap = 0; mipmap < mipmapCount; mipmap++) {
        prefilterCustomBg.setRoughness(mipmap / (mipmapCount - 1));

        preFilterMipmapRT.viewport.set(
            0,
            0,
            preFilterMipmapRT.width >> mipmap,
            preFilterMipmapRT.height >> mipmap
        );

        preFilterCam.activeMipmapLevel = mipmap;
        preFilterCam.update(renderer, prefilterScene);
    }
};
```



#### 测试预计算辐照图以及mipmap

在我们进行下一步之前，我们先验证一下我们最终得到的辐照图以及mipmap是否正确。我们编写一个用于测试的shader

顶点着色器：

```glsl
varying vec2 vUv;
void main() {
    gl_Position = vec4(position, 1.0);
    vUv = uv;
}
```

片段着色器：

```glsl
varying vec2 vUv;
uniform samplerCube envMap;
uniform float uLevel;
void main() {
    vec2 uv = vUv * vec2(4.0, 3.0);
    vec2 st = fract(uv);
    vec2 id = floor(uv);
    st = st * 2.0 - 1.0;
    vec3 color;
    vec3 dir = vec3(0.0);
    if(id.x == 1.0 && id.y == 1.0) {
        dir = normalize(vec3(st.x, st.y, -1.0));
    } else if(id.x == 0.0 && id.y == 1.0) {
        dir = normalize(vec3(-1.0, st.y, -st.x));
    } else if(id.x == 2.0 && id.y == 1.0) {
        dir = normalize(vec3(1.0, st.y, st.x));
    } else if(id.x == 3.0 && id.y == 1.0) {
        dir = normalize(vec3(-st.x, st.y, 1.0));
    } else if(id.x == 1.0 && id.y == 2.0) {
        dir = normalize(vec3(st.x, 1.0, st.y));
    } else if(id.x == 1.0 && id.y == 0.0) {
        dir = normalize(vec3(st.x, -1.0, -st.y));
    }
    color = textureLod(envMap, dir, uLevel).rgb;

    color = color / (color + vec3(1.0));
    color = pow(color, vec3(1.0 / 2.2));
    gl_FragColor = vec4(color, 1.0);
}
```

测试代码：

```typescript
let debugScene: THREE.Scene;
const debugPreFilterMipMap = () => {
    debugScene = new THREE.Scene();
    const mat = new THREE.ShaderMaterial({
        vertexShader: normalVert,
        fragmentShader: debugPrefilterFrag,
        uniforms: {
            envMap: {
                value: preFilterMipmapRT.texture,
            },
            uLevel: {
                value: 0,
            },
        },
    });
    const geo = new THREE.PlaneGeometry(2, 2);
    const mesh = new THREE.Mesh(geo, mat);
    debugScene.add(mesh);
    renderer.render(debugScene, mainCamera);
};
```

我们不断的调整`uLevel`来查看渲染出来的图片是否正确。以下是结果：

<div style="display: flex;align-items: end;justify-content:space-around">
    <img src="https://picbed-1255660905.cos.ap-chengdu.myqcloud.com/doc/image-20240124104955685.png" alt="image-20240104110311993" style="zoom:50%;" />
    <img src="https://picbed-1255660905.cos.ap-chengdu.myqcloud.com/doc/image-20240124105042907.png" alt="image-20240104110326579" style="zoom:50%;" />
        <img src="https://picbed-1255660905.cos.ap-chengdu.myqcloud.com/doc/image-20240124105116811.png" alt="image-20240104110326579" style="zoom:50%;" />
</div>

上面只展示了mipmap中前3层的图像，我们很明显能够看出随着mipmap层级的增加，图片越发的模糊。说明我们的辐照图计算正确。

接下来，我们开始进行BRDF项积分的预计算了。

## 预计算BRDF积分项

还是和上面一样，理论部分就直接跳过啦，咱们只需要知道这一部分需要进行预计算即可，具体的代码放在下面。

```glsl
varying vec2 vUv;

const float PI = 3.14159265359;
// ----------------------------------------------------------------------------
// http://holger.dammertz.org/stuff/notes_HammersleyOnHemisphere.html
// efficient VanDerCorpus calculation.
float RadicalInverse_VdC(uint bits) {
    bits = (bits << 16u) | (bits >> 16u);
    bits = ((bits & 0x55555555u) << 1u) | ((bits & 0xAAAAAAAAu) >> 1u);
    bits = ((bits & 0x33333333u) << 2u) | ((bits & 0xCCCCCCCCu) >> 2u);
    bits = ((bits & 0x0F0F0F0Fu) << 4u) | ((bits & 0xF0F0F0F0u) >> 4u);
    bits = ((bits & 0x00FF00FFu) << 8u) | ((bits & 0xFF00FF00u) >> 8u);
    return float(bits) * 2.3283064365386963e-10; // / 0x100000000
}
// ----------------------------------------------------------------------------
vec2 Hammersley(uint i, uint N) {
    return vec2(float(i) / float(N), RadicalInverse_VdC(i));
}
// ----------------------------------------------------------------------------
vec3 ImportanceSampleGGX(vec2 Xi, vec3 N, float roughness) {
    float a = roughness * roughness;

    float phi = 2.0 * PI * Xi.x;
    float cosTheta = sqrt((1.0 - Xi.y) / (1.0 + (a * a - 1.0) * Xi.y));
    float sinTheta = sqrt(1.0 - cosTheta * cosTheta);

	// from spherical coordinates to cartesian coordinates - halfway vector
    vec3 H;
    H.x = cos(phi) * sinTheta;
    H.y = sin(phi) * sinTheta;
    H.z = cosTheta;

	// from tangent-space H vector to world-space sample vector
    vec3 up = abs(N.z) < 0.999 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);
    vec3 tangent = normalize(cross(up, N));
    vec3 bitangent = cross(N, tangent);

    vec3 sampleVec = tangent * H.x + bitangent * H.y + N * H.z;
    return normalize(sampleVec);
}
// ----------------------------------------------------------------------------
float GeometrySchlickGGX(float NdotV, float roughness) {
    // note that we use a different k for IBL
    float a = roughness;
    float k = (a * a) / 2.0;

    float nom = NdotV;
    float denom = NdotV * (1.0 - k) + k;

    return nom / denom;
}
// ----------------------------------------------------------------------------
float GeometrySmith(vec3 N, vec3 V, vec3 L, float roughness) {
    float NdotV = max(dot(N, V), 0.0);
    float NdotL = max(dot(N, L), 0.0);
    float ggx2 = GeometrySchlickGGX(NdotV, roughness);
    float ggx1 = GeometrySchlickGGX(NdotL, roughness);

    return ggx1 * ggx2;
}
// ----------------------------------------------------------------------------
vec2 IntegrateBRDF(float NdotV, float roughness) {
    vec3 V;
    V.x = sqrt(1.0 - NdotV * NdotV);
    V.y = 0.0;
    V.z = NdotV;

    float A = 0.0;
    float B = 0.0;

    vec3 N = vec3(0.0, 0.0, 1.0);

    const uint SAMPLE_COUNT = 1024u;
    for(uint i = 0u; i < SAMPLE_COUNT; ++i) {
        // generates a sample vector that's biased towards the
        // preferred alignment direction (importance sampling).
        vec2 Xi = Hammersley(i, SAMPLE_COUNT);
        vec3 H = ImportanceSampleGGX(Xi, N, roughness);
        vec3 L = normalize(2.0 * dot(V, H) * H - V);

        float NdotL = max(L.z, 0.0);
        float NdotH = max(H.z, 0.0);
        float VdotH = max(dot(V, H), 0.0);

        if(NdotL > 0.0) {
            float G = GeometrySmith(N, V, L, roughness);
            float G_Vis = (G * VdotH) / (NdotH * NdotV);
            float Fc = pow(1.0 - VdotH, 5.0);

            A += (1.0 - Fc) * G_Vis;
            B += Fc * G_Vis;
        }
    }
    A /= float(SAMPLE_COUNT);
    B /= float(SAMPLE_COUNT);
    return vec2(A, B);
}
// ----------------------------------------------------------------------------
void main() {
    vec2 integratedBRDF = IntegrateBRDF(vUv.x, vUv.y);
    gl_FragColor = vec4(integratedBRDF, 0.0, 1.0);
}
```



与上面相同，再进行下一步之前我们检查一下BRDF这一步的计算是否正确。

#### 测试BRDF

测试代码如下：

```typescript
const brdfRT = new THREE.WebGLRenderTarget(512, 512, {
    type: THREE.FloatType,
});
let brdfScene: THREE.Scene;
const renderBRDF = () => {
    const brdfMat = new THREE.ShaderMaterial({
        vertexShader: brdfVert,
        fragmentShader: brdfFrag,
    });
    const quadGeo = new THREE.PlaneGeometry(2, 2);
    const fullScreen = new THREE.Mesh(quadGeo, brdfMat);
    brdfScene = new THREE.Scene();
    brdfScene.add(fullScreen);
    renderer.setRenderTarget(brdfRT);
    renderer.render(brdfScene, mainCamera);
    renderer.setRenderTarget(null);
};
```



渲染结果如下，符合预期。

<img src="https://picbed-1255660905.cos.ap-chengdu.myqcloud.com/doc/image-20240124110436070.png" alt="image-20240124110436070" style="zoom:33%;" />

现目前再算上之前渲染的IBL漫反射部分的辐照图，我们的准备工作就完成了。现在我们修改我们的PBR shader代码。最终的代码如下：



```glsl
#include <common>
#include <lights_pars_begin>
vec3 fresnelSchlick(float cosTheta, vec3 F0) {
    return F0 + (1.0 - F0) * pow(clamp(1.0 - cosTheta, 0.0, 1.0), 5.0);
}
float DistributionGGX(vec3 N, vec3 H, float roughness) {
    float a = roughness * roughness;
    float a2 = a * a;
    float NdotH = max(dot(N, H), 0.0);
    float NdotH2 = NdotH * NdotH;

    float num = a2;
    float denom = (NdotH2 * (a2 - 1.0) + 1.0);
    denom = PI * denom * denom;

    return num / denom;
}

float GeometrySchlickGGX(float NdotV, float roughness) {
    float r = (roughness + 1.0);
    float k = (r * r) / 8.0;

    float num = NdotV;
    float denom = NdotV * (1.0 - k) + k;

    return num / denom;
}
float GeometrySmith(vec3 N, vec3 V, vec3 L, float roughness) {
    float NdotV = max(dot(N, V), 0.0);
    float NdotL = max(dot(N, L), 0.0);
    float ggx2 = GeometrySchlickGGX(NdotV, roughness);
    float ggx1 = GeometrySchlickGGX(NdotL, roughness);

    return ggx1 * ggx2;
}

vec3 fresnelSchlickRoughness(float cosTheta, vec3 F0, float roughness) {
    return F0 + (max(vec3(1.0 - roughness), F0) - F0) * pow(1.0 - cosTheta, 5.0);
}  

varying vec3 vNormal;
varying vec2 vUv;
varying vec3 vWorldPosition;
uniform vec3 albedo;
uniform float metallic;
uniform float roughness;
uniform float ao;
uniform samplerCube irradianceMap;
uniform samplerCube prefilterMap;
uniform sampler2D brdfLUT;

void main() {
    vec3 N = normalize(vNormal);
    vec3 V = normalize(cameraPosition - vWorldPosition);
    vec3 R = reflect(-V, N);

    vec3 F0 = vec3(0.04);
    F0 = mix(F0, albedo, metallic);
    vec3 Lo = vec3(0.0);

    vec3 WorldPos = vWorldPosition;
    PointLight pointLight;
    for(int i = 0; i < 4; i++) {

        pointLight = pointLights[i];

            // calculate per-light radiance
        vec3 L = normalize(pointLight.position - WorldPos);
        vec3 H = normalize(V + L);
        float distance = length(pointLight.position - WorldPos);
        float attenuation = 1.0 / (distance * distance);
        vec3 radiance = pointLight.color * attenuation;

            // cook-torrance brdf
        float NDF = DistributionGGX(N, H, roughness);
        float G = GeometrySmith(N, V, L, roughness);
        vec3 F = fresnelSchlick(max(dot(H, V), 0.0), F0);

        vec3 kS = F;
        vec3 kD = vec3(1.0) - kS;
        kD *= 1.0 - metallic;

        vec3 nominator = NDF * G * F;
        float denominator = 4.0 * max(dot(N, V), 0.0) * max(dot(N, L), 0.0) + 0.001;
        vec3 specular = nominator / denominator;

            // add to outgoing radiance Lo
        float NdotL = max(dot(N, L), 0.0);
        Lo += (kD * albedo / PI + specular) * radiance * NdotL;
            // Lo += N;
    }
    vec3 F = fresnelSchlickRoughness(max(dot(N, V), 0.0), F0, roughness);
    vec3 kS = F;
    vec3 kD = 1.0 - kS;
    kD *= 1.0 - metallic;

    vec3 irradiance = textureCube(irradianceMap, N).rgb;
    vec3 diffuse = irradiance * albedo;

    const float MAX_REFLECTION_LOD = 4.0;
    vec3 prefilteredColor = textureLod(prefilterMap, R, roughness * MAX_REFLECTION_LOD).rgb;
    vec2 brdf = texture(brdfLUT, vec2(max(dot(N, V), 0.0), roughness)).rg;
    vec3 specular = prefilteredColor * (F * brdf.x + brdf.y);

    vec3 ambient = (kD * diffuse + specular) * ao;
    vec3 color = ambient + Lo;

    color = color / (color + vec3(1.0));
    color = pow(color, vec3(1.0 / 2.2));
    gl_FragColor = vec4(color, 1.0);
}
```

最终的结果如下：

![image-20240124112655272](https://picbed-1255660905.cos.ap-chengdu.myqcloud.com/doc/image-20240124112655272.png)

# 总结

在IBL镜面反射的部分比漫反射的部分稍微复杂了一丢丢，实际上是复杂了很多，但是由于我们跳过了理论的部分，所以看起来只是多了一个辐照图mipmap的生成和BRDF积分项的预计算。不过我们也不用太过纠结啦，最后结果出来就好啦，毕竟咱也不是搞理论的。



最终的代码点此查看：[Three-PBR-IBL-Finished - 码上掘金 (juejin.cn)](https://code.juejin.cn/pen/7327504938668392483)
