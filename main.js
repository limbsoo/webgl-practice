function main() {
    /** @type {HTMLCanvasElement} */
    const canvas = document.getElementById('glCanvas');
    /** @type {WebGLRenderingContext} */
    const gl = canvas.getContext('webgl');

    if (!gl) return;

    // 1. 셰이더 소스 수정 (UV 좌표와 Sampler 추가)
    const vsSource = `
        attribute vec4 aPosition;
        attribute vec2 aTexCoord; // 정점의 UV 좌표
        varying vec2 vTexCoord;   // 프래그먼트 셰이더로 보간되어 넘어갈 UV
        
        uniform mat4 uModelMatrix;
        uniform mat4 uViewMatrix;
        uniform mat4 uProjectionMatrix;
        
        void main() {
            gl_Position = uProjectionMatrix * uViewMatrix * uModelMatrix * aPosition;
            vTexCoord = aTexCoord;
        }
    `;

    const fsSource = `
        precision mediump float;
        varying vec2 vTexCoord;
        
        // 텍스처 데이터를 읽어올 샘플러 (DX11의 Texture2D + SamplerState 역할)
        uniform sampler2D uSampler;
        
        void main() {
            // texture2D 함수를 사용해 UV 위치의 픽셀 색상(Texel)을 추출합니다.
            gl_FragColor = texture2D(uSampler, vTexCoord);
        }
    `;

    const shaderProgram = initShaderProgram(gl, vsSource, fsSource);

    const positionAttribute = gl.getAttribLocation(shaderProgram, 'aPosition');
    const texCoordAttribute = gl.getAttribLocation(shaderProgram, 'aTexCoord');
    
    const uModelMatrix = gl.getUniformLocation(shaderProgram, 'uModelMatrix');
    const uViewMatrix = gl.getUniformLocation(shaderProgram, 'uViewMatrix');
    const uProjectionMatrix = gl.getUniformLocation(shaderProgram, 'uProjectionMatrix');
    const uSampler = gl.getUniformLocation(shaderProgram, 'uSampler');

    // 2. 면(Face)별로 분리된 24개의 정점 데이터 (X, Y, Z, U, V)
    const vertices = new Float32Array([
        // 앞면 (Front)
        -1.0, -1.0,  1.0,   0.0, 0.0,
         1.0, -1.0,  1.0,   1.0, 0.0,
         1.0,  1.0,  1.0,   1.0, 1.0,
        -1.0,  1.0,  1.0,   0.0, 1.0,
        // 뒷면 (Back)
        -1.0, -1.0, -1.0,   1.0, 0.0,
        -1.0,  1.0, -1.0,   1.0, 1.0,
         1.0,  1.0, -1.0,   0.0, 1.0,
         1.0, -1.0, -1.0,   0.0, 0.0,
        // 윗면 (Top)
        -1.0,  1.0, -1.0,   0.0, 1.0,
        -1.0,  1.0,  1.0,   0.0, 0.0,
         1.0,  1.0,  1.0,   1.0, 0.0,
         1.0,  1.0, -1.0,   1.0, 1.0,
        // 아랫면 (Bottom)
        -1.0, -1.0, -1.0,   1.0, 1.0,
         1.0, -1.0, -1.0,   0.0, 1.0,
         1.0, -1.0,  1.0,   0.0, 0.0,
        -1.0, -1.0,  1.0,   1.0, 0.0,
        // 우측면 (Right)
         1.0, -1.0, -1.0,   1.0, 0.0,
         1.0,  1.0, -1.0,   1.0, 1.0,
         1.0,  1.0,  1.0,   0.0, 1.0,
         1.0, -1.0,  1.0,   0.0, 0.0,
        // 좌측면 (Left)
        -1.0, -1.0, -1.0,   0.0, 0.0,
        -1.0, -1.0,  1.0,   1.0, 0.0,
        -1.0,  1.0,  1.0,   1.0, 1.0,
        -1.0,  1.0, -1.0,   0.0, 1.0,
    ]);

    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    // 24개의 정점을 이어서 36개의 꼭짓점을 그리는 인덱스 버퍼
    const indices = new Uint16Array([
        0,  1,  2,      0,  2,  3,    // 앞
        4,  5,  6,      4,  6,  7,    // 뒤
        8,  9,  10,     8,  10, 11,   // 위
        12, 13, 14,     12, 14, 15,   // 아래
        16, 17, 18,     16, 18, 19,   // 우측
        20, 21, 22,     20, 22, 23    // 좌측
    ]);

    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

    // 3. 텍스처 로딩
    const cubeTexture = loadTexture(gl, 'texture.png'); // 준비하신 이미지 파일 이름!

    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);

    gl.useProgram(shaderProgram);

    // 4. Stride / Offset 설정 (X, Y, Z, U, V = 5개)
    const FSIZE = vertices.BYTES_PER_ELEMENT;
    const stride = 5 * FSIZE;

    gl.vertexAttribPointer(positionAttribute, 3, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(positionAttribute);

    gl.vertexAttribPointer(texCoordAttribute, 2, gl.FLOAT, false, stride, 3 * FSIZE); // U, V는 3번째부터 시작
    gl.enableVertexAttribArray(texCoordAttribute);

    let rotation = 0;

    function render(time) {
        time *= 0.001;
        rotation = time;

        gl.clearColor(0.1, 0.1, 0.1, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        const projectionMatrix = mat4.create();
        const viewMatrix = mat4.create();
        const modelMatrix = mat4.create();

        mat4.perspective(projectionMatrix, 45 * Math.PI / 180, canvas.clientWidth / canvas.clientHeight, 0.1, 100.0);
        mat4.translate(viewMatrix, viewMatrix, [0.0, 0.0, -5.0]);
        mat4.rotate(modelMatrix, modelMatrix, rotation, [1, 0, 0]);
        mat4.rotate(modelMatrix, modelMatrix, rotation * 0.7, [0, 1, 0]);

        gl.uniformMatrix4fv(uProjectionMatrix, false, projectionMatrix);
        gl.uniformMatrix4fv(uViewMatrix, false, viewMatrix);
        gl.uniformMatrix4fv(uModelMatrix, false, modelMatrix);

        // --- 텍스처 바인딩 ---
        gl.activeTexture(gl.TEXTURE0);        // 0번 텍스처 유닛 활성화
        gl.bindTexture(gl.TEXTURE_2D, cubeTexture); // 로드한 텍스처 바인딩
        gl.uniform1i(uSampler, 0);            // 셰이더의 uSampler에 0번 텍스처 유닛을 쓰라고 알려줌

        gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);

        requestAnimationFrame(render);
    }

    requestAnimationFrame(render);
}

// --- 텍스처 로딩 함수 ---
function loadTexture(gl, url) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // 이미지가 로드되기 전까지 큐브에 파란색 1x1 픽셀을 임시로 씌워둡니다.
    const pixel = new Uint8Array([0, 0, 255, 255]); // 파란색
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixel);

    // 브라우저의 Image 객체를 통해 비동기로 이미지 로드
    const image = new Image();
    image.onload = function() {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

        // 텍스처 필터링 설정 (Mipmap 생성)
        if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
            gl.generateMipmap(gl.TEXTURE_2D);
        } else {
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        }
    };
    image.src = url;

    return texture;
}

function isPowerOf2(value) { return (value & (value - 1)) == 0; }

function initShaderProgram(gl, vsSource, fsSource) {
    const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);
    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);
    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) return null;
    return shaderProgram;
}

function loadShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return null;
    return shader;
}

window.onload = main;