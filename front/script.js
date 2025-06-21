window.onload = () => {
  const input = document.getElementById('customExtInput');
  const addBtn = document.getElementById('addBtn');
  const tagsContainer = document.getElementById('customTagsContainer');
  const countDisplay = document.getElementById('countDisplay');
  const fileInput = document.getElementById('fileInput');

  const maxCount = 200;
  const baseUrl = 'http://localhost:8080/api/fix/extensions';

  let fixExts = new Set();
  let customExts = [];

  // ✅ 초기 로딩: 서버 데이터 가져오기
  fetch(baseUrl)
    .then(res => {
      if (!res.ok) throw new Error('제한확장자 데이터 불러오기 실패');
      return res.json();
    })
    .then(response => {
      fixExts.clear();

      response.items.forEach(item => {
        const ext = item.extName;

        if (item.extType === 'fixed') {
          fixExts.add(ext);
          document.querySelectorAll('.fixed-extensions input[type="checkbox"]').forEach(cb => {
            if (cb.value === ext) cb.checked = true;
          });
        }

        if (item.extType === 'custom') {
          if (!customExts.includes(ext)) {
            customExts.push(ext);
          }
        }
      });

      renderTags();
      updateCount();
    })
    .catch(err => {
      console.error('에러발생:', err.message);
    });

  // ✅ 고정 확장자 체크박스 처리
  document.querySelectorAll('.fixed-extensions input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', (e) => {
      const extension = e.target.value;
      const isChecked = e.target.checked;

      const request = isChecked
        ? fetch(baseUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ extName: extension, extType: 'fixed' })
          })
        : fetch(`${baseUrl}/${encodeURIComponent(extension)}`, {
            method: 'DELETE'
          });

      request
        .then(res => {
          if (res.ok) {
            isChecked ? fixExts.add(extension) : fixExts.delete(extension);
          } else {
            e.target.checked = !isChecked;
            throw new Error('고정 확장자 업데이트 실패');
          }
        })
        .catch(err => {
          alert(`고정 확장자 오류: ${err.message}`);
          e.target.checked = !isChecked;
        });
    });
  });

  // ✅ 인풋 입력 시 버튼 활성화
  input.addEventListener('input', () => {
    const val = input.value.trim();
    addBtn.disabled = val === '';
  });

  // ✅ 커스텀 태그 렌더링
  function renderTags() {
    tagsContainer.innerHTML = '';
    customExts.forEach((ext, idx) => {
      const tag = document.createElement('div');
      tag.className = 'tag';

      const span = document.createElement('span');
      span.textContent = ext;

      const btn = document.createElement('button');
      btn.textContent = '×';
      btn.title = '삭제';
      btn.addEventListener('click', () => {
        fetch(`${baseUrl}/${encodeURIComponent(ext)}`, {
          method: 'DELETE'
        })
          .then(res => {
            if (!res.ok) throw new Error('삭제 실패');
            customExts.splice(idx, 1);
            renderTags();
            updateCount();
          })
          .catch(err => {
            alert(`커스텀 삭제 오류: ${err.message}`);
          });
      });

      tag.appendChild(span);
      tag.appendChild(btn);
      tagsContainer.appendChild(tag);
    });
  }

  // ✅ 갯수 업데이트
  function updateCount() {
    countDisplay.textContent = `${customExts.length}/${maxCount}`;
    addBtn.disabled = input.value.trim() === '' || customExts.length >= maxCount;
  }

  // ✅ 커스텀 확장자 추가
  addBtn.addEventListener('click', () => {
    const val = input.value.trim().toLowerCase();

    if (val === '') return;
    if (!/^[a-z0-9]+$/.test(val)) return alert('확장자는 영문자와 숫자만 가능합니다.');
    if (fixExts.has(val)) return alert(`"${val}" 확장자는 고정 확장자에 포함되어 있습니다.`);
    if (customExts.includes(val)) return alert('이미 등록된 확장자입니다.');
    if (customExts.length >= maxCount) return alert(`최대 ${maxCount}개까지 등록 가능합니다.`);

    fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ extName: val, extType: 'custom' })
    })
      .then(res => {
        if (!res.ok) throw new Error('추가 실패');
        customExts.push(val);
        input.value = '';
        renderTags();
        updateCount();
      })
      .catch(err => {
        alert(`추가 오류: ${err.message}`);
      });
  });

  // ✅ 파일 업로드 시 확장자 제한 체크
  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (!file) return;

    const ext = file.name.split('.').pop().toLowerCase();

    if (fixExts.has(ext) || customExts.includes(ext)) {
      alert(`'${ext}' 확장자는 업로드할 수 없습니다.`);
      fileInput.value = '';
    }
  });

  updateCount(); // 초기화
};