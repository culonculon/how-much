#!/usr/bin/env bash
# sudo /opt/how-much/bin/install-release.sh <sha> | --rollback
set -euo pipefail

KEEP=3
STAGE=/var/tmp/how-much-deploy

exec 9>/run/how-much-deploy.lock
flock -n 9 || { echo "다른 배포가 돌고 있습니다" >&2; exit 1; }

# 현재 링크 대상(없으면 빈 값)
cur() { readlink "/opt/how-much/$1/current" 2>/dev/null || true; }

swap() { # <api|app> <대상 폴더>
  ln -sfn "$2" "/opt/how-much/$1/.current.new"
  mv -T "/opt/how-much/$1/.current.new" "/opt/how-much/$1/current"
}

# 재시작 뒤 확인 셋: listening 줄 · POST 400 · GET 200
verify() {
  local since out i
  since=$1
  for i in 1 2 3 4 5 6 7 8 9 10; do
    out=$(journalctl -u how-much-api -o cat --since "$since" || true)
    # D1 '나': 127.0.0.1 에서 듣는다(nginx가 같은 컴퓨터에서 넘김)
    if grep -qF '"evt":"listening","address":"127.0.0.1"' <<<"$out"; then
      [ "$(curl -s -o /dev/null -w '%{http_code}' -X POST -H 'Content-Type: image/jpeg' --data-binary x http://127.0.0.1:8787/api/appraise)" = 400 ] &&
        [ "$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1/)" = 200 ]
      return
    fi
    sleep 0.5
  done
  return 1
}

restart_and_verify() {
  local since
  since=$(date '+%Y-%m-%d %H:%M:%S')
  systemctl restart how-much-api && verify "$since"
}

# 최근 $KEEP판과 현재 판 밖을 지운다
prune() {
  local d old keep_cur
  for d in api app; do
    keep_cur=$(basename "$(cur "$d")")
    for old in $(ls -1t "/opt/how-much/$d/releases" | tail -n +$((KEEP + 1))); do
      [[ $old =~ ^[0-9a-f]{7,40}$ ]] || continue
      [ "$old" = "$keep_cur" ] && continue
      rm -rf -- "/opt/how-much/$d/releases/$old"
    done
  done
}

case "${1:-}" in
  --rollback)
    now=$(basename "$(cur api)")
    # shortcut: 가장 최근에 푼 다른 판으로 간다(연달아 두 번 하면 되돌아옴), 판이 더 쌓이면 이력 파일로
    prev=$(ls -1t /opt/how-much/api/releases | grep -vxF -- "$now" | head -n 1 || true)
    [ -n "$prev" ] && [ -d "/opt/how-much/app/releases/$prev" ] || { echo "되돌릴 앞 판이 없습니다" >&2; exit 1; }
    swap api "/opt/how-much/api/releases/$prev"
    swap app "/opt/how-much/app/releases/$prev"
    restart_and_verify || { echo "되돌린 뒤 확인 실패" >&2; exit 1; }
    echo "rolled back to $prev"
    ;;
  *)
    sha=${1:-}
    [[ $sha =~ ^[0-9a-f]{7,40}$ ]] || { echo "사용법: $0 <sha> | --rollback" >&2; exit 1; }
    dir="$STAGE/$sha"
    [ -d "$dir" ] || { echo "$dir 가 없습니다" >&2; exit 1; }
    (cd "$dir" && sha256sum -c SHA256SUMS)

    for d in api app; do
      rel="/opt/how-much/$d/releases"
      # 이미 있는 판(같은 sha)은 다시 풀지 않는다 — 완성된 폴더만 이름을 얻는다
      [ -d "$rel/$sha" ] && continue
      rm -rf -- "/opt/how-much/$d/releases/.new-$sha"
      mkdir "$rel/.new-$sha"
      tar -xzf "$dir/$d-$sha.tar.gz" -C "$rel/.new-$sha" --no-same-owner
      chmod -R a+rX,go-w "$rel/.new-$sha"
      touch "$rel/.new-$sha" # 판 순서 = 배포 순서(prune · rollback이 ls -t로 본다)
      mv -T "$rel/.new-$sha" "$rel/$sha"
    done

    prev_api=$(cur api)
    prev_app=$(cur app)
    swap api "/opt/how-much/api/releases/$sha"
    swap app "/opt/how-much/app/releases/$sha"

    if ! restart_and_verify; then
      echo "확인 실패 — 앞 판으로 되돌립니다" >&2
      if [ -n "$prev_api" ] && [ -n "$prev_app" ]; then
        swap api "$prev_api"
        swap app "$prev_app"
        systemctl restart how-much-api || true
      else
        echo "앞 판이 없습니다(첫 배포)" >&2
      fi
      exit 1
    fi

    prune
    rm -rf -- "/var/tmp/how-much-deploy/$sha"
    echo "deployed $sha"
    ;;
esac
