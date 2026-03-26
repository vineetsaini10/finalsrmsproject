function ok(res, data = {}, message = 'OK', status = 200) {
  return res.status(status).json({ success: true, data, message });
}

function fail(res, status = 400, message = 'Bad request', extras = {}) {
  return res.status(status).json({ success: false, data: null, message, ...extras });
}

module.exports = { ok, fail };
