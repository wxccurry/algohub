FROM openjdk:17-slim

RUN useradd -m judge && mkdir -p /judge && chown judge:judge /judge
COPY judge_service/scripts/judge_java.sh /usr/local/bin/judge.sh

RUN chmod +x /usr/local/bin/judge.sh
USER judge
WORKDIR /judge

ENTRYPOINT ["/usr/local/bin/judge.sh"]
