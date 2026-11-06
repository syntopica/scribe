import assert from 'node:assert/strict'
import test from 'node:test'
import { createNeedleMatcher } from './createNeedleMatcher'

void test('a needle is found at the start, the middle and the end of a text', () => {
  const contains = createNeedleMatcher(['needle-0123456789'])
  assert.equal(contains('needle-0123456789 and more'), true)
  assert.equal(contains('some text needle-0123456789 and more'), true)
  assert.equal(contains('some text needle-0123456789'), true)
  assert.equal(contains('needle-0123456789'), true)
})

void test('a text holding only a prefix of a needle does not match', () => {
  const contains = createNeedleMatcher(['needle-0123456789'])
  assert.equal(contains('needle-01234 cut short'), false)
  assert.equal(contains(''), false)
  assert.equal(contains('short'), false)
})

void test('short needles and non-ASCII text are found too', () => {
  const contains = createNeedleMatcher(['a:b', 'contraseña-ñ01'])
  assert.equal(contains('https://a:b@host'), true)
  assert.equal(contains('la contraseña-ñ01 es'), true)
  assert.equal(contains('nada aquí'), false)
})

void test('it agrees with a plain search on random texts', () => {
  const alphabet = 'abcd01-'
  let seed = 7
  const random = () => {
    seed = (Math.imul(seed, 1103515245) + 12345) >>> 0
    return seed
  }
  const word = (length: number) =>
    Array.from({ length }, () => alphabet[random() % alphabet.length]).join('')
  const needles = Array.from({ length: 40 }, () => word(6 + (random() % 8)))
  const contains = createNeedleMatcher(needles)
  for (let round = 0; round < 2000; round++) {
    const text = word(random() % 60)
    assert.equal(
      contains(text),
      needles.some((needle) => text.includes(needle)),
      text,
    )
  }
})
