function main() {
    /** @type {HTMLCanvasElement} */
    const canvas = document.getElementById('glCanvas');
    /** @type {WebGLRenderingContext} */
    const gl = canvas.getContext('webgl');

    if (!gl) return;

    // 1. 셰이더 소스 수정 (Phong Shading 계산)
    const vsSource = `
        attribute vec4 aPosition;
        attribute vec3 aNormal; // 정점의 법선 벡터
        
        varying vec3 vNormal;   // 프래그먼트 셰이더로 넘겨줄 법선
        varying vec3 vPosition; // 프래그먼트 셰이더로 넘겨줄 뷰 공간 정점 위치
        
        uniform mat4 uModelMatrix;
        uniform mat4 uViewMatrix;
        uniform mat4 uProjectionMatrix;
        uniform mat4 uNormalMatrix; // 법선 변환용 행렬 (ModelView의 Inverse Transpose)
        
        void main() {
            // 정점 위치 계산 (뷰 공간)
            vec4 viewPosition = uViewMatrix * uModelMatrix * aPosition;
            gl_Position = uProjectionMatrix * viewPosition;
            
            // 법선 벡터 계산 및 정규화 (뷰 공간으로 변환)
            vNormal = normalize(vec3(uNormalMatrix * vec4(aNormal, 0.0)));
            vPosition = viewPosition.xyz; // 뷰 공간에서의 정점 위치 전달
        }
    `;

    const fsSource = `
        precision mediump float;
        
        varying vec3 vNormal;
        varying vec3 vPosition;
        
        // 조명 및 머티리얼 속성 (Uniforms)
        uniform vec3 uLightPosition;     // 뷰 공간에서의 빛 위치
        uniform vec3 uLightAmbient;      // 빛의 환경광 색상
        uniform vec3 uLightDiffuse;      // 빛의 난반사광 색상
        uniform vec3 uLightSpecular;     // 빛의 경면반사광 색상
        
        uniform vec3 uMaterialAmbient;   // 머티리얼 환경광 반사 계수
        uniform vec3 uMaterialDiffuse;   // 머티리얼 난반사광 반사 계수
        uniform vec3 uMaterialSpecular;  // 머티리얼 경면반사광 반사 계수
        uniform float uShininess;        // 경면성 (하이라이트 크기)
        
        void main() {
            // 1. 정규화된 벡터들 계산
            vec3 normal = normalize(vNormal);
            vec3 lightDir = normalize(uLightPosition - vPosition); // 정점에서 빛을 향하는 벡터
            vec3 viewDir = normalize(-vPosition); // 정점에서 카메라(원점)를 향하는 벡터
            
            // 2. Ambient 계산
            vec3 ambient = uLightAmbient * uMaterialAmbient;
            
            // 3. Diffuse 계산 (Lambertian 코사인 법칙)
            float diffuseFactor = max(dot(normal, lightDir), 0.0);
            vec3 diffuse = uLightDiffuse * uMaterialDiffuse * diffuseFactor;
            
            // 4. Specular 계산 (Phong 모델)
            vec3 reflectDir = reflect(-lightDir, normal); // 빛의 반사 벡터
            float specularFactor = pow(max(dot(reflectDir, viewDir), 0.0), uShininess);
            vec3 specular = uLightSpecular * uMaterialSpecular * specularFactor;
            
            // 5. 최종 색상 결합
            vec3 finalColor = ambient + diffuse + specular;
            gl_FragColor = vec4(finalColor, 1.0);
        }
    `;

    const shaderProgram = initShaderProgram(gl, vsSource, fsSource);

    const positionAttribute = gl.getAttribLocation(shaderProgram, 'aPosition');
    const normalAttribute = gl.getAttribLocation(shaderProgram, 'aNormal');
    
    // Uniform 위치들 가져오기 (종류가 많습니다!)
    const uModelMatrix = gl.getUniformLocation(shaderProgram, 'uModelMatrix');
    const uViewMatrix = gl.getUniformLocation(shaderProgram, 'uViewMatrix');
    const uProjectionMatrix = gl.getUniformLocation(shaderProgram, 'uProjectionMatrix');
    const uNormalMatrix = gl.getUniformLocation(shaderProgram, 'uNormalMatrix');
    
    const uLightPosition = gl.getUniformLocation(shaderProgram, 'uLightPosition');
    const uLightAmbient = gl.getUniformLocation(shaderProgram, 'uLightAmbient');
    const uLightDiffuse = gl.getUniformLocation(shaderProgram, 'uLightDiffuse');
    const uLightSpecular = gl.getUniformLocation(shaderProgram, 'uLightSpecular');
    
    const uMaterialAmbient = gl.getUniformLocation(shaderProgram, 'uMaterialAmbient');
    const uMaterialDiffuse = gl.getUniformLocation(shaderProgram, 'uMaterialDiffuse');
    const uMaterialSpecular = gl.getUniformLocation(shaderProgram, 'uMaterialSpecular');
    const uShininess = gl.getUniformLocation(shaderProgram, 'uShininess');

    // 2. 면(Face)별로 분리된 24개의 정점 데이터 (X, Y, Z, Nx, Ny, Nz)
    const vertices = new Float32Array([
        // 앞면 (Front) - 법선: [0, 0, 1]
        -1.0, -1.0,  1.0,   0.0, 0.0, 1.0,
         1.0, -1.0,  1.0,   0.0, 0.0, 1.0,
         1.0,  1.0,  1.0,   0.0, 0.0, 1.0,
        -1.0,  1.0,  1.0,   0.0, 0.0, 1.0,
        // 뒷면 (Back) - 법선: [0, 0, -1]
        -1.0, -1.0, -1.0,   0.0, 0.0, -1.0,
        -1.0,  1.0, -1.0,   0.0, 0.0, -1.0,
         1.0,  1.0, -1.0,   0.0, 0.0, -1.0,
         1.0, -1.0, -1.0,   0.0, 0.0, -1.0,
        // 윗면 (Top) - 법선: [0, 1, 0]
        -1.0,  1.0, -1.0,   0.0, 1.0, 0.0,
        -1.0,  1.0,  1.0,   0.0, 1.0, 0.0,
         1.0,  1.0,  1.0,   0.0, 1.0, 0.0,
         1.0,  1.0, -1.0,   0.0, 1.0, 0.0,
        // 아랫면 (Bottom) - 법선: [0, -1, 0]
        -1.0, -1.0, -1.0,   0.0, -1.0, 0.0,
         1.0, -1.0, -1.0,   0.0, -1.0, 0.0,
         1.0, -1.0,  1.0,   0.0, -1.0, 0.0,
        -1.0, -1.0,  1.0,   0.0, -1.0, 0.0,
        // 우측면 (Right) - 법선: [1, 0, 0]
         1.0, -1.0, -1.0,   1.0, 0.0, 0.0,
         1.0,  1.0, -1.0,   1.0, 0.0, 0.0,
         1.0,  1.0,  1.0,   1.0, 0.0, 0.0,
         1.0, -1.0,  1.0,   1.0, 0.0, 0.0,
        // 좌측면 (Left) - 법선: [-1, 0, 0]
        -1.0, -1.0, -1.0,  -1.0, 0.0, 0.0,
        -1.0, -1.0,  1.0,  -1.0, 0.0, 0.0,
        -1.0,  1.0,  1.0,  -1.0, 0.0, 0.0,
        -1.0,  1.0, -1.0,  -1.0, 0.0, 0.0,
    ]);

    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    // 인덱스 버퍼 (동일)
    const indices = new Uint16Array([
        0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7, 8, 9, 10, 8, 10, 11,
        12, 13, 14, 12, 14, 15, 16, 17, 18, 16, 18, 19, 20, 21, 22, 20, 22, 23
    ]);
    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.useProgram(shaderProgram);

    // Stride / Offset 설정 (X, Y, Z, Nx, Ny, Nz = 6개)
    const FSIZE = vertices.BYTES_PER_ELEMENT;
    const stride = 6 * FSIZE;
    gl.vertexAttribPointer(positionAttribute, 3, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(positionAttribute);
    gl.vertexAttribPointer(normalAttribute, 3, gl.FLOAT, false, stride, 3 * FSIZE);
    gl.enableVertexAttribArray(normalAttribute);

    // 3. 고정된 조명 및 머티리얼 속성 설정
    // 빛: 백색광
    gl.uniform3fv(uLightAmbient, [0.2, 0.2, 0.2]); // 약한 환경광
    gl.uniform3fv(uLightDiffuse, [1.0, 1.0, 1.0]); // 강한 난반사광
    gl.uniform3fv(uLightSpecular, [1.0, 1.0, 1.0]); // 강한 경면반사광
    gl.uniform3fv(uLightPosition, [5.0, 5.0, -10.0]); // 뷰 공간에서의 빛 위치

    // 머티리얼: 붉은색 플라스틱 느낌
    gl.uniform3fv(uMaterialAmbient, [1.0, 0.0, 0.0]); // 빨간색 환경광 반사
    gl.uniform3fv(uMaterialDiffuse, [1.0, 0.0, 0.0]); // 빨간색 난반사
    gl.uniform3fv(uMaterialSpecular, [1.0, 1.0, 1.0]); // 흰색 하이라이트
    gl.uniform1f(uShininess, 32.0); // 경면성

    let rotation = 0;

    function render(time) {
        time *= 0.001;
        rotation = time;
        gl.clearColor(0.1, 0.1, 0.1, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        const projectionMatrix = mat4.create();
        const viewMatrix = mat4.create();
        const modelMatrix = mat4.create();
        const modelViewMatrix = mat4.create();
        const normalMatrix = mat4.create(); // 법선 행렬 추가

        mat4.perspective(projectionMatrix, 45 * Math.PI / 180, canvas.clientWidth / canvas.clientHeight, 0.1, 100.0);
        mat4.translate(viewMatrix, viewMatrix, [0.0, 0.0, -5.0]);
        mat4.rotate(modelMatrix, modelMatrix, rotation, [1, 0, 0]);
        mat4.rotate(modelMatrix, modelMatrix, rotation * 0.7, [0, 1, 0]);

        // --- 노멀 행렬(Normal Matrix) 계산 (매우 중요!) ---
        // 1. ModelView 행렬 계산
        mat4.multiply(modelViewMatrix, viewMatrix, modelMatrix);
        // 2. ModelView의 역행렬(Invert) 계산
        mat4.invert(normalMatrix, modelViewMatrix);
        // 3. 역행렬의 전치행렬(Transpose) 계산
        mat4.transpose(normalMatrix, normalMatrix);

        gl.uniformMatrix4fv(uProjectionMatrix, false, projectionMatrix);
        gl.uniformMatrix4fv(uViewMatrix, false, viewMatrix);
        gl.uniformMatrix4fv(uModelMatrix, false, modelMatrix);
        // 계산한 노멀 행렬 전송
        gl.uniformMatrix4fv(uNormalMatrix, false, normalMatrix);

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