THRESHOLD=100
TIMEOUT=10000

test:
	@node node_modules/.bin/lab -m ${TIMEOUT}
test-cov:
	@node node_modules/.bin/lab -t ${THRESHOLD} -m ${TIMEOUT} -v -p
test-cov-html:
	@node node_modules/.bin/lab -r html -o coverage.html -m ${TIMEOUT} -p

.PHONY: test test-cov test-cov-html
