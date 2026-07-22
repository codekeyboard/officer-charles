const liveInterviewService = require('@src/services/LiveInterviewService');

exports.start = async (req, res, next) => {
  try {
    const data = await liveInterviewService.start(req.user, req.body || {});
    res.status(201).json({ success: true, message: 'Live interview started.', data });
  } catch (error) {
    next(error);
  }
};

exports.token = async (req, res, next) => {
  try {
    const data = await liveInterviewService.createToken(req.user, req.params.sessionId, req.body || {});
    res.json({ success: true, message: 'Live session token created.', data });
  } catch (error) {
    next(error);
  }
};

exports.config = async (req, res, next) => {
  try {
    const data = await liveInterviewService.getConfig(req.user, req.params.sessionId);
    res.json({ success: true, message: 'Live session config loaded.', data });
  } catch (error) {
    next(error);
  }
};

exports.transcript = async (req, res, next) => {
  try {
    const data = await liveInterviewService.addTranscript(req.user, req.params.sessionId, req.body || {});
    res.status(201).json({ success: true, message: 'Live transcript stored.', data });
  } catch (error) {
    next(error);
  }
};

exports.event = async (req, res, next) => {
  try {
    const data = await liveInterviewService.addEvent(req.user, req.params.sessionId, req.body || {});
    res.status(201).json({ success: true, message: 'Live event stored.', data });
  } catch (error) {
    next(error);
  }
};

exports.complete = async (req, res, next) => {
  try {
    const data = await liveInterviewService.complete(req.user, req.params.sessionId);
    res.json({ success: true, message: 'Live interview completed.', data });
  } catch (error) {
    next(error);
  }
};

exports.abandon = async (req, res, next) => {
  try {
    const data = await liveInterviewService.abandon(req.user, req.params.sessionId);
    res.json({ success: true, message: 'Live interview abandoned.', data });
  } catch (error) {
    next(error);
  }
};

exports.status = async (req, res, next) => {
  try {
    const data = await liveInterviewService.status(req.user, req.params.sessionId);
    res.json({ success: true, message: 'Live session status loaded.', data });
  } catch (error) {
    next(error);
  }
};
