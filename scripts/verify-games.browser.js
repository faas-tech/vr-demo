// Run in the local page through agent-browser eval --stdin (not a Node script).
(async () => {
  const checks = [];
  const assert = (condition, label) => { if (!condition) throw new Error(label); checks.push(label); };
  const click = selector => { const element = document.querySelector(selector); if (!element || element.disabled) throw new Error(`Unavailable control: ${selector}`); element.click(); };
  const waitFor = async predicate => {
    const deadline = performance.now() + 6000;
    while (!predicate()) { if (performance.now() > deadline) throw new Error("Timed out waiting for game state"); await new Promise(requestAnimationFrame); }
  };
  const restart = () => {
    click('#restart-game');
    if (document.querySelector('#restart-game').textContent === 'Confirm restart') click('#restart-game');
  };
  const settled = () => waitFor(() => !window.getGameSnapshot().isAnimating && !window.getGameSnapshot().player.isTraveling);
  const state = () => window.getGameSnapshot();
  click('#choose-connect-four');
  restart();
  window.placeReviewCamera('blueStand');
  assert(!state().canPlay && document.querySelector('[data-cell="3"]').disabled, 'Cliff arrival blocks game input');
  click('#game-travel'); await settled();
  assert(state().player.level === 'play' && state().canPlay, 'Descent enables play on the lower terrace');
  const passTurn = async () => {
    if (state().player.side !== state().turn) { click('#game-travel'); await settled(); }
    if (state().player.level !== 'play') { click('#game-travel'); await settled(); }
    assert(state().canPlay, `Correct terrace can play: ${state().turn}`);
  };
  for (const column of [0, 1, 0, 1, 0, 1, 0]) {
    await passTurn();
    click(`[data-cell="${column}"]`);
    assert(state().isAnimating && !state().canPlay, 'In-flight piece locks additional moves');
    await settled();
  }
  assert(state().result === 'blue' && state().moveCount === 7, 'Connect Four completes a full two-player winning game');
  assert([...document.querySelectorAll('#board-controls button')].every(button => button.disabled), 'Finished board rejects further input');
  const wonPosition = JSON.stringify(state().cells);
  click('#restart-game');
  assert(JSON.stringify(state().cells) === wonPosition, 'Restart requires a second explicit click');
  click('#choose-checkers'); restart();
  assert(state().cells.filter(Boolean).length === 24, 'Checkers starts with 24 pieces');
  await passTurn();
  document.querySelector('#move-controls').open = true;
  click('[data-cell="17"]');
  assert(state().selectedCell === 17 && !document.querySelector('[data-cell="24"]').disabled, 'Selecting a checker reveals legal destinations');
  click('[data-cell="24"]'); await settled();
  assert(state().cells[17] === null && state().cells[24].player === 'blue' && state().turn === 'yellow', 'Checker lands and hands off the turn');
  await passTurn();
  click('[data-cell="40"]'); click('[data-cell="33"]'); await settled();
  assert(state().cells[33].player === 'yellow' && state().turn === 'blue', 'Yellow can make a reply from the opposite terrace');
  const checkerPosition = JSON.stringify(state().cells);
  click('#choose-connect-four');
  assert(JSON.stringify(state().cells) === wonPosition, 'Switching games preserves Connect Four');
  click('#choose-checkers');
  assert(JSON.stringify(state().cells) === checkerPosition, 'Switching games preserves checkers');
  await new Promise(requestAnimationFrame); await new Promise(requestAnimationFrame);
  const before = window.getCanyonDiagnostics();
  for (let i = 0; i < 8; i++) {
    click('#choose-connect-four'); await new Promise(requestAnimationFrame);
    click('#choose-checkers'); await new Promise(requestAnimationFrame);
  }
  await new Promise(requestAnimationFrame);
  const after = window.getCanyonDiagnostics();
  assert(after.geometries === before.geometries && after.textures === before.textures, 'Repeated game switches release old GPU resources');
  const seed = after.seed;
  click('#rebuild-same-seed'); await new Promise(requestAnimationFrame);
  assert(window.getCanyonDiagnostics().seed === seed && JSON.stringify(state().cells) === checkerPosition, 'Rebuilding the environment preserves the active game');
  const { GameMenu } = await import('/src/games/GameMenu.ts');
  const { Ray, Vector3 } = await import('/node_modules/three/build/three.module.js');
  const menu = new GameMenu(); menu.mesh.visible = true;
  for (const side of ['blue', 'yellow']) for (const level of ['arrival', 'play']) {
    const surfaceY = level === 'arrival' ? 23 : -2;
    const centerZ = (side === 'blue' ? -1 : 1) * (level === 'arrival' ? 23 : 14);
    menu.update({ colorName: side, level, centerX: 0, surfaceY, centerZ, widthInBlocks: 7, depthInBlocks: 5 }, state(), 'Descend to play', false, false);
    const origin = new Vector3(0, surfaceY + 1.6, centerZ);
    for (let index = 0; index < 5; index++) {
      const localY = (0.5 - (145 + index * 110 + 46) / 880) * 2.18;
      const center = menu.mesh.localToWorld(new Vector3(0, localY, 0));
      const target = menu.pick(new Ray(origin, center.sub(origin).normalize()));
      assert(target?.index === index && target.kind === 'menu', `World menu ray target ${index}: ${side} ${level}`);
    }
  }
  menu.dispose();
  return { checks, diagnostics: window.getCanyonDiagnostics(), game: state().game };
})()
