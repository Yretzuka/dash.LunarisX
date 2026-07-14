const { validationResult } = require('express-validator');

/** Drop this after any express-validator chain: [check('x').isString(), validate] */
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Validation failed.', details: errors.array() });
  }
  next();
}

module.exports = validate;
