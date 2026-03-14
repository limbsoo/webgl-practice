function main() {
    /** @type {HTMLCanvasElement} */
    const canvas = document.getElementById('glCanvas');
    /** @type {WebGLRenderingContext} */
    const gl = canvas.getContext('webgl');

    if (!gl) return;

    // 1. 셰이더 소스 (MVP 행렬 추가)
    const vsSource = `
        attribute vec4 aPosition;
        attribute vec4 aColor;
        varying vec4 vColor;
        
        // MVP 행렬 유니폼 변수
        uniform mat4 uModelMatrix;
        uniform mat4 uViewMatrix;
        uniform mat4 uProjectionMatrix;
        
        void main() {
            // 정점 위치에 투영 * 뷰 * 모델 행렬을 곱해 클립 공간(Clip Space) 좌표로 변환
            gl_Position = uProjectionMatrix * uViewMatrix * uModelMatrix * aPosition;
            vColor = aColor;
        }
    `;

    const fsSource = `
        precision mediump float;
        varying vec4 vColor;
        void main() {
            gl_FragColor = vColor;
        }
    `;

    const shaderProgram = initShaderProgram(gl, vsSource, fsSource);

    // 2. Attribute 및 Uniform 위치 가져오기
    const positionAttribute = gl.getAttribLocation(shaderProgram, 'aPosition');
    const colorAttribute = gl.getAttribLocation(shaderProgram, 'aColor');
    
    const uModelMatrix = gl.getUniformLocation(shaderProgram, 'uModelMatrix');
    const uViewMatrix = gl.getUniformLocation(shaderProgram, 'uViewMatrix');
    const uProjectionMatrix = gl.getUniformLocation(shaderProgram, 'uProjectionMatrix');

    // 3. 큐브 데이터 세팅 (8개의 꼭짓점)
    const vertices = new Float32Array([
        // X, Y, Z           R, G, B, A
        // 앞면
        -1.0, -1.0,  1.0,   1.0, 1.0, 1.0, 1.0, // 0: 하양
         1.0, -1.0,  1.0,   1.0, 0.0, 0.0, 1.0, // 1: 빨강
         1.0,  1.0,  1.0,   0.0, 1.0, 0.0, 1.0, // 2: 초록
        -1.0,  1.0,  1.0,   0.0, 0.0, 1.0, 1.0, // 3: 파랑
        // 뒷면
        -1.0, -1.0, -1.0,   0.0, 1.0, 1.0, 1.0, // 4: 시안
        -1.0,  1.0, -1.0,   1.0, 0.0, 1.0, 1.0, // 5: 마젠타
         1.0,  1.0, -1.0,   1.0, 1.0, 0.0, 1.0, // 6: 노랑
         1.0, -1.0, -1.0,   0.0, 0.0, 0.0, 1.0  // 7: 검정
    ]);

    // 정점 버퍼(VBO)
    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    // 인덱스 버퍼 (IBO) - 어떤 순서로 꼭짓점을 이어 삼각형을 만들지 정의
    const indices = new Uint16Array([
        0, 1, 2,   0, 2, 3, // 앞면
        4, 5, 6,   4, 6, 7, // 뒷면
        5, 3, 2,   5, 2, 6, // 윗면
        4, 7, 1,   4, 1, 0, // 아랫면
        7, 6, 2,   7, 2, 1, // 우측면
        4, 0, 3,   4, 3, 5  // 좌측면
    ]);

    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

    // 4. 상태 설정 (깊이 테스트 활성화 - 매우 중요!)
    gl.enable(gl.DEPTH_TEST); 
    gl.depthFunc(gl.LEQUAL);

    gl.useProgram(shaderProgram);

    // 데이터 레이아웃 설정
    const FSIZE = vertices.BYTES_PER_ELEMENT;
    const stride = 7 * FSIZE; // X, Y, Z, R, G, B, A = 7개

    gl.vertexAttribPointer(positionAttribute, 3, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(positionAttribute);

    gl.vertexAttribPointer(colorAttribute, 4, gl.FLOAT, false, stride, 3 * FSIZE);
    gl.enableVertexAttribArray(colorAttribute);

    // 5. 렌더링 루프
    let rotation = 0;

    function render(time) {
        time *= 0.001;
        rotation = time;

        // 화면 갱신 시 컬러 버퍼와 '깊이 버퍼(Z-buffer)'를 함께 지웁니다.
        gl.clearColor(0.1, 0.1, 0.1, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // --- MVP 매트릭스 계산 (gl-matrix 라이브러리 사용) ---
        const projectionMatrix = mat4.create();
        const viewMatrix = mat4.create();
        const modelMatrix = mat4.create();

        // 1. Projection (투영 행렬): 원근감(Perspective) 부여 (시야각 45도, 종횡비, Near, Far)
        const aspect = canvas.clientWidth / canvas.clientHeight;
        mat4.perspective(projectionMatrix, 45 * Math.PI / 180, aspect, 0.1, 100.0);

        // 2. View (뷰 행렬): 카메라 위치 설정 (Z축으로 5만큼 뒤로 이동)
        mat4.translate(viewMatrix, viewMatrix, [0.0, 0.0, -5.0]);

        // 3. Model (모델 행렬): 큐브 회전 (X축, Z축으로 동시 회전)
        mat4.rotate(modelMatrix, modelMatrix, rotation, [1, 0, 0]); // X축 회전
        mat4.rotate(modelMatrix, modelMatrix, rotation * 0.7, [0, 1, 0]); // Y축 회전

        // --- 유니폼 변수로 행렬 전송 ---
        gl.uniformMatrix4fv(uProjectionMatrix, false, projectionMatrix);
        gl.uniformMatrix4fv(uViewMatrix, false, viewMatrix);
        gl.uniformMatrix4fv(uModelMatrix, false, modelMatrix);

        // --- 인덱스 버퍼를 사용하여 그리기 (Draw Call) ---
        // gl.drawArrays 대신 gl.drawElements를 사용합니다.
        gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);

        requestAnimationFrame(render);
    }

    requestAnimationFrame(render);
}

// initShaderProgram과 loadShader는 이전과 동일
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