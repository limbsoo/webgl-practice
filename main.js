function main() {

    const canvas = document.getElementById('glCanvas');
    const gl = canvas.getContext('webgl');

    if (!gl) {
        alert('이 브라우저에서는 WebGL을 지원하지 않습니다.');
        return;
    }

    

    // 1. 셰이더 소스 코드 작성 (GLSL)
    // 버텍스 셰이더: 정점의 위치(NDC 좌표)를 결정합니다.
    const vsSource = `
        attribute vec4 aVertexPosition;
        void main() {
            gl_Position = aVertexPosition;
        }
    `;

    // 프래그먼트 셰이더: 픽셀의 색상을 결정합니다. (여기서는 단색 빨간색)
    const fsSource = `
        void main() {
            gl_FragColor = vec4(1.0, 1.0, 0.0, 1.0); // RGBA
        }
    `;

    // 2. 셰이더 컴파일 및 프로그램 생성 (아래 헬퍼 함수 사용)
    const shaderProgram = initShaderProgram(gl, vsSource, fsSource);

    // 3. 셰이더 프로그램에서 속성(Attribute) 위치 가져오기
    const vertexPositionAttribute = gl.getAttribLocation(shaderProgram, 'aVertexPosition');

    // 4. 버텍스 버퍼(VBO) 생성 및 데이터 할당
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    // WebGL의 좌표계(NDC)는 중앙이 (0,0)이고 화면 끝이 -1.0 ~ 1.0 입니다.
    const positions = [
         0.0,  0.5,  // 위쪽 중앙 (x, y)
        -0.5, -0.5,  // 왼쪽 아래
         0.5, -0.5,  // 오른쪽 아래
    ];
    
    // 자바스크립트 배열을 WebGL이 이해할 수 있는 32비트 부동소수점 배열로 변환하여 VRAM에 올립니다.
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    // 5. 화면 렌더링 준비
    gl.clearColor(0.2, 0.2, 0.2, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // 우리가 만든 셰이더 프로그램을 파이프라인에 바인딩
    gl.useProgram(shaderProgram);

    // 6. 버텍스 속성 활성화 및 메모리 레이아웃(Stride/Offset) 지정
    gl.enableVertexAttribArray(vertexPositionAttribute);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    
    const size = 2;          // 위치 데이터는 x, y 2개의 컴포넌트
    const type = gl.FLOAT;   // 32비트 부동 소수점
    const normalize = false; // 정규화 안 함
    const stride = 0;        // 다음 정점까지의 바이트 수 (0이면 size에 맞춰 자동 계산)
    const offset = 0;        // 버퍼 시작 위치
    gl.vertexAttribPointer(vertexPositionAttribute, size, type, normalize, stride, offset);

    // 7. 대망의 Draw Call! 3개의 정점을 그려서 삼각형(TRIANGLES)을 생성합니다.
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