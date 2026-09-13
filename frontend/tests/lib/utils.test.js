// ── Tests: frontend/src/lib/utils.js ──
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { EMAIL_RE, initialsOf, emailOk, passwordChecks, avatarUrl } from '../../src/lib/utils.js';

describe('initialsOf', () => {
  it('takes the first letter of the first two words', () => {
    assert.equal(initialsOf('Juan Dela Cruz'), 'JD');
  });
  it('uppercases and truncates to 2 characters', () => {
    assert.equal(initialsOf('maria santos'), 'MS');
  });
  it('falls back to FT for empty/missing names', () => {
    assert.equal(initialsOf(''), 'FT');
    assert.equal(initialsOf(undefined), 'FT');
    assert.equal(initialsOf('   '), 'FT');
  });
});

describe('emailOk', () => {
  it('accepts typical addresses', () => {
    assert.ok(emailOk('juan@mail.com'));
    assert.ok(emailOk('  A.B+tag@sub.domain.ph '));
  });
  it('rejects malformed input', () => {
    for (const bad of ['', 'x', 'a@b', 'a@b.', '@b.com']) {
      assert.equal(emailOk(bad), false, `expected false for ${JSON.stringify(bad)}`);
    }
  });
  it('exports a regex matching the shared contract', () => {
    assert.ok(EMAIL_RE instanceof RegExp);
  });
});

describe('passwordChecks', () => {
  it('flags each rule independently', () => {
    const noUpper = passwordChecks('abc123');
    assert.equal(noUpper.hasMinLength, true);
    assert.equal(noUpper.hasNumber, true);
    assert.equal(noUpper.hasUppercase, false);
    assert.equal(noUpper.ok, false);
  });
  it('ok only when all three rules pass', () => {
    // Policy (matches backend assertPassword): 6+ chars, at least one
    // uppercase letter, at least one digit. Case mix is not required.
    assert.equal(passwordChecks('Abc123').ok, true);
    assert.equal(passwordChecks('ABC123').ok, true);
    assert.equal(passwordChecks('abc123').ok, false); // no uppercase
    assert.equal(passwordChecks('ABC12').ok, false);  // too short
    assert.equal(passwordChecks('Abcdef').ok, false); // no number
  });
  it('handles null input without throwing', () => {
    const r = passwordChecks(null);
    assert.equal(r.ok, false);
    assert.equal(r.hasMinLength, false);
  });
});

describe('avatarUrl', () => {
  it('normalises any stored path to /uploads/<file>', () => {
    assert.equal(avatarUrl('/uploads/img.png'), '/uploads/img.png');
    assert.equal(avatarUrl('C:\\server\\uploads\\img.png'), '/uploads/img.png');
    assert.equal(avatarUrl('img.png'), '/uploads/img.png');
  });
  it('returns null for missing values', () => {
    assert.equal(avatarUrl(null), null);
    assert.equal(avatarUrl(undefined), null);
    assert.equal(avatarUrl(''), null);
  });
});
