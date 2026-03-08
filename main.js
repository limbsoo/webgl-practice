function main() {
    // 1. HTML에서 캔버스 요소를 가져옵니다.
    const canvas = document.getElementById('glCanvas');

    // 2. WebGL 렌더링 컨텍스트를 초기화합니다.
    const gl = canvas.getContext('webgl');

    // WebGL을 지원하지 않는 브라우저를 위한 예외 처리
    if (!gl) {
        alert('이 브라우저에서는 WebGL을 지원하지 않습니다.');
        return;
    }

    // 3. 화면을 지울 색상을 설정합니다. (RGBA 포맷, 0.0 ~ 1.0 사이 값)
    // 여기서는 짙은 회색으로 설정해 보겠습니다.
    gl.clearColor(0.2, 0.2, 0.2, 1.0);

    // 4. 설정한 색상으로 컬러 버퍼를 지워 화면을 렌더링합니다.
    gl.clear(gl.COLOR_BUFFER_BIT);
}

// 스크립트가 로드되면 main 함수 실행
window.onload = main;