#!/usr/bin/env bash
# 서버에서 한 번 실행한다: sudo bash setup-host.sh (infra/deploy/ 폴더 안에서). 다시 돌려도 같은 결과.
set -euo pipefail

here=$(cd "$(dirname "$0")" && pwd)

[ "$(id -u)" = 0 ] || { echo "root로 실행하세요" >&2; exit 1; }
[ "$(uname -m)" = aarch64 ] || { echo "aarch64 서버가 아닙니다: $(uname -m)" >&2; exit 1; }
# Node 설치는 이 스크립트가 하지 않는다(I0′). 단위 파일 ExecStart가 /usr/bin/node를 부른다.
case "$(/usr/bin/node --version 2>/dev/null || true)" in
  v22.*) ;;
  *) echo "/usr/bin/node 가 Node 22가 아닙니다" >&2; exit 1 ;;
esac

id howmuch >/dev/null 2>&1 ||
  useradd --system --create-home --home-dir /home/howmuch --shell /sbin/nologin howmuch

install -d -o root -g root -m 0755 /opt/how-much/api/releases /opt/how-much/app/releases /opt/how-much/bin
install -o root -g root -m 0755 "$here/install-release.sh" /opt/how-much/bin/install-release.sh

install -o root -g root -m 0644 "$here/how-much-api.service" /etc/systemd/system/how-much-api.service

install -d -o root -g root -m 0755 /etc/systemd/journald.conf.d
printf '[Journal]\nStorage=persistent\nSystemMaxUse=200M\n' >/etc/systemd/journald.conf.d/how-much.conf
systemctl restart systemd-journald

install -o root -g root -m 0644 "$here/how-much-nginx.conf" /etc/nginx/conf.d/how-much.conf
if ! nginx -t; then
  # 지우지 않고 이름만 바꿔 nginx가 읽지 않게 한다
  mv -f /etc/nginx/conf.d/how-much.conf /etc/nginx/conf.d/how-much.conf.rejected
  echo "nginx -t 실패: 설정을 how-much.conf.rejected 로 치웠습니다" >&2
  exit 1
fi

systemctl daemon-reload
systemctl enable how-much-api
systemctl reload nginx
