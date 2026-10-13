import assert from 'node:assert/strict'
import test from 'node:test'
import { JSDOM } from 'jsdom'
import { registerSource } from './helpers/onboarding-source.mjs'
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://fixture.example/', pretendToBeVisual: true })
for (const name of ['window', 'document', 'navigator', 'HTMLElement', 'Element', 'Node', 'Event', 'MutationObserver', 'getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame']) Object.defineProperty(globalThis, name, { configurable: true, value: dom.window[name] })
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const { createElement: h, act } = await import('react')
const { createRoot } = await import('react-dom/client')
const hooks = registerSource()
const { SidebarSwitch } = await import('../src/components/sidebar-switch.tsx')
hooks.deregister()

const layers = (container) => [...container.querySelectorAll('[data-slot="sidebar-layer"]')].map((layer) => ({
  id: layer.textContent,
  state: layer.dataset.state,
  className: layer.className,
  node: layer,
}))

async function mount(t, props) {
  const container = document.createElement('div'); document.body.append(container)
  const root = createRoot(container)
  const show = async (next) => act(async () => root.render(h(SidebarSwitch, { ...props, ...next }, (id) => h('nav', null, id))))
  await show({})
  t.after(async () => { await act(async () => root.unmount()); container.remove() })
  return { container, show }
}

test('the first sidebar mounts without motion and a deeper one is pushed in from the right', async (t) => {
  const { container, show } = await mount(t, { id: 'home', depth: 0 })
  assert.deepEqual(layers(container).map(({ id, state }) => ({ id, state })), [{ id: 'home', state: 'current' }])
  assert.doesNotMatch(layers(container)[0].className, /animate-/)

  await show({ id: 'admin', depth: 1 })
  const [leaving, entering] = layers(container)
  assert.equal(leaving.id, 'home'); assert.equal(leaving.state, 'leaving')
  assert.match(leaving.className, /animate-out .*slide-out-to-left-1\/3/)
  assert.match(leaving.className, /pointer-events-none/)
  assert.equal(leaving.node.getAttribute('aria-hidden'), 'true')
  assert.equal(entering.id, 'admin'); assert.equal(entering.state, 'current')
  assert.match(entering.className, /animate-in slide-in-from-right/)

  await act(async () => leaving.node.dispatchEvent(new window.Event('animationend', { bubbles: true })))
  assert.deepEqual(layers(container).map(({ id }) => id), ['admin'])
})

test('going back pops the current sidebar out to the right and reveals the shallower one', async (t) => {
  const { container, show } = await mount(t, { id: 'admin', depth: 1 })
  await show({ id: 'home', depth: 0 })
  const [leaving, entering] = layers(container)
  assert.equal(leaving.id, 'admin')
  assert.match(leaving.className, /slide-out-to-right/)
  assert.match(leaving.className, /z-10/)
  assert.equal(entering.id, 'home')
  assert.match(entering.className, /slide-in-from-left-1\/3/)
  // A child's animation ending must not drop the layer early.
  await act(async () => leaving.node.firstChild.dispatchEvent(new window.Event('animationend', { bubbles: true })))
  assert.equal(layers(container).length, 2)
})

test('a leaving layer is dropped by the fallback timer where animation events never fire', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const { container, show } = await mount(t, { id: 'home', depth: 0 })
  await show({ id: 'settings', depth: 1 })
  assert.equal(layers(container).length, 2)
  await act(async () => t.mock.timers.tick(400))
  assert.deepEqual(layers(container).map(({ id }) => id), ['settings'])
})

test('reversing mid-animation keeps both sidebars mounted and just swaps their roles', async (t) => {
  const { container, show } = await mount(t, { id: 'home', depth: 0 })
  await show({ id: 'admin', depth: 1 })
  const [homeBefore, adminBefore] = layers(container)
  await show({ id: 'home', depth: 0 })
  const [adminAfter, homeAfter] = layers(container)
  assert.equal(adminAfter.node, adminBefore.node); assert.equal(adminAfter.state, 'leaving')
  assert.equal(homeAfter.node, homeBefore.node); assert.equal(homeAfter.state, 'current')
  assert.match(adminAfter.className, /slide-out-to-right/)
})
