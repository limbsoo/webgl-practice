function main() {
    /** @type {HTMLCanvasElement} */
    const canvas = document.getElementById('glCanvas');
    /** @type {WebGLRenderingContext} */
    const gl = canvas.getContext('webgl');

    if (!gl) return;

    // 1. 버텍스 셰이더에 uniform 행렬 변수 추가
    const vsSource = `
        attribute vec2 aPosition;
        attribute vec3 aColor;
        
        varying vec3 vColor;
        
        // 자바스크립트에서 받아올 4x4 변환 행렬
        uniform mat4 uRotationMatrix; 
        
        void main() {
            // 행렬 곱셈을 통해 정점의 위치를 변환합니다. (순서 주의: 행렬 * 벡터)
            gl_Position = uRotationMatrix * vec4(aPosition, 0.0, 1.0);
            vColor = aColor;
        }
    `;

    const fsSource = `
        precision mediump float;
        varying vec3 vColor;
        void main() {
            gl_FragColor = vec4(vColor, 1.0);
        }
    `;

    const shaderProgram = initShaderProgram(gl, vsSource, fsSource);

    // 2. Attribute 및 Uniform 위치 가져오기
    const positionAttribute = gl.getAttribLocation(shaderProgram, 'aPosition');
    const colorAttribute = gl.getAttribLocation(shaderProgram, 'aColor');
    // uniform 변수의 위치를 가져옵니다.
    const rotationMatrixUniform = gl.getUniformLocation(shaderProgram, 'uRotationMatrix');

    const vertices = new Float32Array([
         0.0,  0.5,   1.0, 0.0, 0.0,
        -0.5, -0.5,   0.0, 1.0, 0.0,
         0.5, -0.5,   0.0, 0.0, 1.0
    ]);

    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const FSIZE = vertices.BYTES_PER_ELEMENT;
    gl.vertexAttribPointer(positionAttribute, 2, gl.FLOAT, false, 5 * FSIZE, 0);
    gl.enableVertexAttribArray(positionAttribute);
    gl.vertexAttribPointer(colorAttribute, 3, gl.FLOAT, false, 5 * FSIZE, 2 * FSIZE);
    gl.enableVertexAttribArray(colorAttribute);

    gl.clearColor(0.2, 0.2, 0.2, 1.0);
    gl.useProgram(shaderProgram);

    // 3. 렌더링 루프 함수 작성
    function render(time) {
        time *= 0.001; // 밀리초(ms)를 초(s) 단위로 변환
        
        // 각도에 따른 cos, sin 값 계산
        const c = Math.cos(time);
        const s = Math.sin(time);

        // Z축 회전 행렬 정의 (WebGL은 Column-major 열 우선 방식을 사용합니다)
        const matrix = new Float32Array([
             c,  s, 0.0, 0.0,
            -s,  c, 0.0, 0.0,
           0.0, 0.0, 1.0, 0.0,
           0.0, 0.0, 0.0, 1.0
        ]);

        // 화면 지우기
        gl.clear(gl.COLOR_BUFFER_BIT);

        // 셰이더의 uniform 변수에 생성한 행렬 데이터 넘기기
        gl.uniformMatrix4fv(rotationMatrixUniform, false, matrix);

        // 그리기
        gl.drawArrays(gl.TRIANGLES, 0, 3);

        // 다음 프레임 요청 (애니메이션 루프)
        requestAnimationFrame(render);
    }

    // 렌더링 루프 시작!
    requestAnimationFrame(render);
}


// --- 셰이더 컴파일 및 링킹을 위한 헬퍼 함수들 (이후 프로젝트에서도 계속 재사용됩니다) ---
function initShaderProgram(gl, vsSource, fsSource) {
    const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        console.error('셰이더 프로그램 초기화 실패: ' + gl.getProgramInfoLog(shaderProgram));
        return null;
    }
    return shaderProgram;
}

function loadShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('셰이더 컴파일 에러: ' + gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

window.onload = main;