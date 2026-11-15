import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { getAccessToken, setAccessToken, getStoredUser, setStoredUser } from '../../src/api.js';

// Minimal in-memory Web Storage stand-in for Node (no localStorage there).
class FakeStorage {
  constructor() { this.map = new Map(); }
  getItem(k) { return this.map.has(k) ? this.map.get(k) : null; }
  setItem(k, v) { this.map.set(k, String(v)); }
  removeItem(k) { this.map.delete(k); }
  clear() { this.map.clear(); }
  get length() { return this.map.size; }
}

const TOKEN_KEY = 'fairtrike_access_token';
const USER_KEY = 'fairtrike_user';

describe('session storage (Remember device)', () => {
  let ls;
  let ss;

  beforeEach(() => {
    ls = new FakeStorage();
    ss = new FakeStorage();
    globalThis.localStorage = ls;
    globalThis.sessionStorage = ss;
  });

  afterEach(() => {
    delete globalThis.localStorage;
    delete globalThis.sessionStorage;
  });

  describe('getAccessToken', () => {
    it('returns null when no token is stored anywhere', () => {
      assert.equal(getAccessToken(), null);
    });

    it('prefers the remembered (localStorage) token', () => {
      ls.setItem(TOKEN_KEY, 'remembered');
      ss.setItem(TOKEN_KEY, 'session');
      assert.equal(getAccessToken(), 'remembered');
    });

    it('falls back to the session-only (sessionStorage) token', () => {
      ss.setItem(TOKEN_KEY, 'session');
      assert.equal(getAccessToken(), 'session');
    });
  });

  describe('setAccessToken', () => {
    it('remember:true writes only to localStorage', () => {
      setAccessToken('tok', { remember: true });
      assert.equal(ls.getItem(TOKEN_KEY), 'tok');
      assert.equal(ss.getItem(TOKEN_KEY), null);
      assert.equal(getAccessToken(), 'tok');
    });

    it('remember:false writes only to sessionStorage', () => {
      setAccessToken('tok', { remember: false });
      assert.equal(ss.getItem(TOKEN_KEY), 'tok');
      assert.equal(ls.getItem(TOKEN_KEY), null);
      assert.equal(getAccessToken(), 'tok');
    });

    it('defaults to remembered when no option is given (auto-login flows)', () => {
      setAccessToken('tok');
      assert.equal(ls.getItem(TOKEN_KEY), 'tok');
      assert.equal(ss.getItem(TOKEN_KEY), null);
    });

    it('re-login without remember clears a stale remembered token', () => {
      setAccessToken('old', { remember: true });
      setAccessToken('new', { remember: false });
      assert.equal(ls.getItem(TOKEN_KEY), null);
      assert.equal(ss.getItem(TOKEN_KEY), 'new');
    });

    it('re-login with remember clears a stale session-only token', () => {
      setAccessToken('old', { remember: false });
      setAccessToken('new', { remember: true });
      assert.equal(ls.getItem(TOKEN_KEY), 'new');
      assert.equal(ss.getItem(TOKEN_KEY), null);
    });

    it('setAccessToken(null) ends the session in both stores (logout)', () => {
      ls.setItem(TOKEN_KEY, 'remembered');
      ss.setItem(TOKEN_KEY, 'session');
      setAccessToken(null);
      assert.equal(ls.getItem(TOKEN_KEY), null);
      assert.equal(ss.getItem(TOKEN_KEY), null);
      assert.equal(getAccessToken(), null);
    });
  });

  describe('stored user', () => {
    it('setStoredUser mirrors the remembered token into localStorage', () => {
      setAccessToken('tok', { remember: true });
      setStoredUser({ id: 1, fullname: 'Ana' });
      assert.deepEqual(JSON.parse(ls.getItem(USER_KEY)), { id: 1, fullname: 'Ana' });
      assert.equal(ss.getItem(USER_KEY), null);
      assert.deepEqual(getStoredUser(), { id: 1, fullname: 'Ana' });
    });

    it('setStoredUser mirrors a session-only token into sessionStorage', () => {
      setAccessToken('tok', { remember: false });
      setStoredUser({ id: 2, fullname: 'Ben' });
      assert.equal(ls.getItem(USER_KEY), null);
      assert.deepEqual(JSON.parse(ss.getItem(USER_KEY)), { id: 2, fullname: 'Ben' });
      assert.deepEqual(getStoredUser(), { id: 2, fullname: 'Ben' });
    });

    it('a later remembered login moves the user out of sessionStorage', () => {
      setAccessToken('a', { remember: false });
      setStoredUser({ id: 3 });
      setAccessToken('b', { remember: true });
      setStoredUser({ id: 3 });
      assert.equal(ss.getItem(USER_KEY), null);
      assert.deepEqual(JSON.parse(ls.getItem(USER_KEY)), { id: 3 });
    });

    it('setStoredUser(null) clears the user from both stores', () => {
      ls.setItem(USER_KEY, '{"id":9}');
      ss.setItem(USER_KEY, '{"id":9}');
      setStoredUser(null);
      assert.equal(ls.getItem(USER_KEY), null);
      assert.equal(ss.getItem(USER_KEY), null);
      assert.equal(getStoredUser(), null);
    });

    it('getStoredUser returns null on corrupt JSON instead of throwing', () => {
      ls.setItem(USER_KEY, '{not json');
      assert.equal(getStoredUser(), null);
    });
  });
});
