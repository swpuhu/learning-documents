const vert = `#version 300 es
  in vec4 a_position;
  void main () {
    gl_Position = a_position;
  }
`;

const fragPrefix = `#version 300 es
  precision highp float;

  uniform float iTime;
  uniform vec2 iResolution;
  out vec4 fragColor;
`

const fragTail = `
  void main () {
    mainImage(fragColor, gl_FragCoord.xy);
  }
`;
/**
 * @param gl {WebGLRenderingContext}
 * @param vert {string}
 * @param frag {string}
 */
function initWebGL(gl, vert, frag) {
    const vertShader = gl.createShader(gl.VERTEX_SHADER);
    const fragShader = gl.createShader(gl.FRAGMENT_SHADER);

    gl.shaderSource(vertShader, vert);
    gl.shaderSource(fragShader, frag);
    gl.compileShader(vertShader);
    let sucecess = gl.getShaderParameter(vertShader, gl.COMPILE_STATUS);
    if (!sucecess) {
        console.error(gl.getShaderInfoLog(vertShader));
        gl.deleteShader(vertShader);
        return;
    }

    gl.compileShader(fragShader);
    sucecess = gl.getShaderParameter(fragShader, gl.COMPILE_STATUS);
    if (!sucecess) {
        console.error(gl.getShaderInfoLog(fragShader));
        gl.deleteShader(fragShader);
        return;
    }

    const program = gl.createProgram();
    gl.attachShader(program, vertShader);
    gl.attachShader(program, fragShader);
    gl.linkProgram(program);
    sucecess = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (!sucecess) {
        console.error(gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
        return;
    }
    return program;
}

function ShaderToy(frag) {
    const canvas = document.getElementById('canvas');
    /**
     * @type WebGLRenderingContext
     */
    const gl = canvas.getContext('webgl2');

    const program = initWebGL(gl, vert, fragPrefix + frag + fragTail);

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    const buffer = gl.createBuffer();
    const indicesBuffer = gl.createBuffer();
    const vertices = new Float32Array(
        [-1.0, -1.0, 1.0, -1.0, 1.0, 1.0, -1.0, 1.0]
    );

    const indices = new Uint16Array(
        [0, 1, 2, 2, 3, 0]
    );

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indicesBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    gl.useProgram(program);
    const a_position = gl.getAttribLocation(program, 'a_position');
    gl.vertexAttribPointer(a_position, 2, gl.FLOAT, false, 2 * Float32Array.BYTES_PER_ELEMENT, 0);
    gl.enableVertexAttribArray(a_position);

    const iTime = gl.getUniformLocation(program, 'iTime');
    const iResolution = gl.getUniformLocation(program, 'iResolution');
    let time = 0;
    function mainLoop(t) {
        if (t === void 0) {
            time += 0.01;
        } else {
            time = t * 0.001;

        }
        gl.uniform1f(iTime, time);
        gl.uniform2f(iResolution, canvas.width, canvas.height);
        gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);

        requestAnimationFrame(mainLoop);

    }

    return mainLoop;
}



