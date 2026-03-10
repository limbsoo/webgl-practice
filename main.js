function main() {
    /** @type {HTMLCanvasElement} */
    const canvas = document.getElementById('glCanvas');
    /** @type {WebGLRenderingContext} */
    const gl = canvas.getContext('webgl');

    if (!gl) return;

    // 1. 셰이더 소스 코드 업데이트
    // 버텍스 셰이더: 위치(aPosition)와 색상(aColor)을 받아서, 색상을 vColor로 넘겨줍니다.
    const vsSource = `
        attribute vec2 aPosition;
        attribute vec3 aColor;
        
        varying vec3 vColor; // 프래그먼트 셰이더로 넘겨줄 varying 변수
        
        void main() {
            gl_Position = vec4(aPosition, 0.0, 1.0);
            vColor = aColor; // 입력받은 색상을 그대로 전달
        }
    `;

    // 프래그먼트 셰이더: 버텍스 셰이더에서 넘어온 vColor를 받아 픽셀 색상으로 사용합니다.
    const fsSource = `
        precision mediump float; // float의 정밀도 설정 (WebGL 필수)
        
        varying vec3 vColor; // 버텍스 셰이더에서 넘어온 보간된 색상
        
        void main() {
            gl_FragColor = vec4(vColor, 1.0);
        }
    `;

    const shaderProgram = initShaderProgram(gl, vsSource, fsSource);

    // 2. Attribute 위치 가져오기 (위치와 색상 두 개!)
    const positionAttribute = gl.getAttribLocation(shaderProgram, 'aPosition');
    const colorAttribute = gl.getAttribLocation(shaderProgram, 'aColor');

    // 3. 인터리브드(Interleaved) 버퍼 데이터 구성
    // [X, Y,   R, G, B] 순서로 하나의 배열에 데이터를 묶습니다.
    const vertices = new Float32Array([
         0.0,  0.5,   1.0, 0.0, 0.0, // 위쪽 꼭짓점 (빨강)
        -0.5, -0.5,   0.0, 1.0, 0.0, // 왼쪽 아래 (초록)
         0.5, -0.5,   0.0, 0.0, 1.0  // 오른쪽 아래 (파랑)
    ]);

    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    gl.clearColor(0.2, 0.2, 0.2, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(shaderProgram);

    // 4. 메모리 레이아웃(Stride와 Offset) 설정
    // Float32Array는 요소당 4바이트를 차지합니다.
    const FSIZE = vertices.BYTES_PER_ELEMENT; // 4바이트
    const stride = 5 * FSIZE; // 한 정점의 전체 크기: (X, Y, R, G, B) = 5 * 4 = 20바이트

    // 위치 데이터 설정 (offset = 0)
    gl.vertexAttribPointer(positionAttribute, 2, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(positionAttribute);

    // 색상 데이터 설정 (offset = X, Y 다음이므로 2 * 4 = 8바이트)
    gl.vertexAttribPointer(colorAttribute, 3, gl.FLOAT, false, stride, 2 * FSIZE);
    gl.enableVertexAttribArray(colorAttribute);

    // 5. 그리기!
    gl.drawArrays(gl.TRIANGLES, 0, 3);
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