// Ported from Orca (`renderer/src/lib/workspace-emoji-shortcodes.ts`).
//
// Orca builds its catalog from the `emojibase-data` package. Hydra ships no
// emoji dataset dependency, so the catalog is a curated slice of the standard
// shortcodes: enough for workspace names (status, work, objects) without
// pulling a multi-megabyte package into the renderer bundle.

export type WorkspaceEmojiSuggestion = {
  emoji: string
  shortcode: string
}

export type ActiveWorkspaceEmojiShortcode = {
  end: number
  query: string
  start: number
}

export type WorkspaceEmojiReplacement = {
  cursor: number
  value: string
}

/** Curated `:shortcode:` catalog. First shortcode wins when an emoji repeats. */
const WORKSPACE_EMOJI_CATALOG: readonly WorkspaceEmojiSuggestion[] = [
  { emoji: '🚀', shortcode: 'rocket' },
  { emoji: '✨', shortcode: 'sparkles' },
  { emoji: '🔥', shortcode: 'fire' },
  { emoji: '💡', shortcode: 'bulb' },
  { emoji: '✅', shortcode: 'white_check_mark' },
  { emoji: '☑️', shortcode: 'ballot_box_with_check' },
  { emoji: '❌', shortcode: 'x' },
  { emoji: '⚠️', shortcode: 'warning' },
  { emoji: '🚧', shortcode: 'construction' },
  { emoji: '🐛', shortcode: 'bug' },
  { emoji: '🔧', shortcode: 'wrench' },
  { emoji: '🔨', shortcode: 'hammer' },
  { emoji: '🛠️', shortcode: 'hammer_and_wrench' },
  { emoji: '⚙️', shortcode: 'gear' },
  { emoji: '🧪', shortcode: 'test_tube' },
  { emoji: '🧬', shortcode: 'dna' },
  { emoji: '📦', shortcode: 'package' },
  { emoji: '📌', shortcode: 'pushpin' },
  { emoji: '📍', shortcode: 'round_pushpin' },
  { emoji: '📝', shortcode: 'memo' },
  { emoji: '📄', shortcode: 'page_facing_up' },
  { emoji: '📋', shortcode: 'clipboard' },
  { emoji: '📊', shortcode: 'bar_chart' },
  { emoji: '📈', shortcode: 'chart_with_upwards_trend' },
  { emoji: '📉', shortcode: 'chart_with_downwards_trend' },
  { emoji: '🗂️', shortcode: 'card_index_dividers' },
  { emoji: '🗃️', shortcode: 'card_file_box' },
  { emoji: '📁', shortcode: 'file_folder' },
  { emoji: '📂', shortcode: 'open_file_folder' },
  { emoji: '🗑️', shortcode: 'wastebasket' },
  { emoji: '🔒', shortcode: 'lock' },
  { emoji: '🔓', shortcode: 'unlock' },
  { emoji: '🔑', shortcode: 'key' },
  { emoji: '🛡️', shortcode: 'shield' },
  { emoji: '🔍', shortcode: 'mag' },
  { emoji: '🔎', shortcode: 'mag_right' },
  { emoji: '💻', shortcode: 'computer' },
  { emoji: '🖥️', shortcode: 'desktop_computer' },
  { emoji: '⌨️', shortcode: 'keyboard' },
  { emoji: '🖱️', shortcode: 'computer_mouse' },
  { emoji: '📱', shortcode: 'iphone' },
  { emoji: '🌐', shortcode: 'globe_with_meridians' },
  { emoji: '☁️', shortcode: 'cloud' },
  { emoji: '🗄️', shortcode: 'file_cabinet' },
  { emoji: '🗺️', shortcode: 'world_map' },
  { emoji: '🧭', shortcode: 'compass' },
  { emoji: '⏰', shortcode: 'alarm_clock' },
  { emoji: '⏳', shortcode: 'hourglass_flowing_sand' },
  { emoji: '🕐', shortcode: 'clock1' },
  { emoji: '📅', shortcode: 'calendar' },
  { emoji: '🗓️', shortcode: 'spiral_calendar' },
  { emoji: '🎯', shortcode: 'dart' },
  { emoji: '🏁', shortcode: 'checkered_flag' },
  { emoji: '🚩', shortcode: 'triangular_flag_on_post' },
  { emoji: '🏆', shortcode: 'trophy' },
  { emoji: '🥇', shortcode: 'first_place_medal' },
  { emoji: '🎉', shortcode: 'tada' },
  { emoji: '🎊', shortcode: 'confetti_ball' },
  { emoji: '👏', shortcode: 'clap' },
  { emoji: '👍', shortcode: 'thumbsup' },
  { emoji: '👎', shortcode: 'thumbsdown' },
  { emoji: '🙌', shortcode: 'raised_hands' },
  { emoji: '💪', shortcode: 'muscle' },
  { emoji: '🤝', shortcode: 'handshake' },
  { emoji: '👀', shortcode: 'eyes' },
  { emoji: '🧠', shortcode: 'brain' },
  { emoji: '🤖', shortcode: 'robot' },
  { emoji: '👾', shortcode: 'space_invader' },
  { emoji: '🛸', shortcode: 'flying_saucer' },
  { emoji: '🌟', shortcode: 'star2' },
  { emoji: '⭐', shortcode: 'star' },
  { emoji: '💫', shortcode: 'dizzy' },
  { emoji: '⚡', shortcode: 'zap' },
  { emoji: '💥', shortcode: 'boom' },
  { emoji: '🧨', shortcode: 'firecracker' },
  { emoji: '🌈', shortcode: 'rainbow' },
  { emoji: '☀️', shortcode: 'sunny' },
  { emoji: '🌙', shortcode: 'crescent_moon' },
  { emoji: '🌊', shortcode: 'ocean' },
  { emoji: '🌱', shortcode: 'seedling' },
  { emoji: '🌿', shortcode: 'herb' },
  { emoji: '🍀', shortcode: 'four_leaf_clover' },
  { emoji: '🌳', shortcode: 'deciduous_tree' },
  { emoji: '🌵', shortcode: 'cactus' },
  { emoji: '🍎', shortcode: 'apple' },
  { emoji: '🍋', shortcode: 'lemon' },
  { emoji: '🍇', shortcode: 'grapes' },
  { emoji: '🍒', shortcode: 'cherries' },
  { emoji: '🍑', shortcode: 'peach' },
  { emoji: '🥑', shortcode: 'avocado' },
  { emoji: '🥕', shortcode: 'carrot' },
  { emoji: '🌶️', shortcode: 'hot_pepper' },
  { emoji: '🍕', shortcode: 'pizza' },
  { emoji: '🍔', shortcode: 'hamburger' },
  { emoji: '🍟', shortcode: 'fries' },
  { emoji: '🍣', shortcode: 'sushi' },
  { emoji: '🍜', shortcode: 'ramen' },
  { emoji: '☕', shortcode: 'coffee' },
  { emoji: '🍵', shortcode: 'tea' },
  { emoji: '🍺', shortcode: 'beer' },
  { emoji: '🍷', shortcode: 'wine_glass' },
  { emoji: '🎂', shortcode: 'birthday' },
  { emoji: '🍩', shortcode: 'doughnut' },
  { emoji: '🐶', shortcode: 'dog' },
  { emoji: '🐱', shortcode: 'cat' },
  { emoji: '🦊', shortcode: 'fox_face' },
  { emoji: '🐻', shortcode: 'bear' },
  { emoji: '🐼', shortcode: 'panda_face' },
  { emoji: '🐨', shortcode: 'koala' },
  { emoji: '🦁', shortcode: 'lion' },
  { emoji: '🐯', shortcode: 'tiger' },
  { emoji: '🐸', shortcode: 'frog' },
  { emoji: '🐵', shortcode: 'monkey_face' },
  { emoji: '🦄', shortcode: 'unicorn' },
  { emoji: '🐝', shortcode: 'bee' },
  { emoji: '🦋', shortcode: 'butterfly' },
  { emoji: '🐙', shortcode: 'octopus' },
  { emoji: '🦀', shortcode: 'crab' },
  { emoji: '🐳', shortcode: 'whale' },
  { emoji: '🦈', shortcode: 'shark' },
  { emoji: '🐢', shortcode: 'turtle' },
  { emoji: '🦉', shortcode: 'owl' },
  { emoji: '🦅', shortcode: 'eagle' },
  { emoji: '🐧', shortcode: 'penguin' },
  { emoji: '🕊️', shortcode: 'dove' },
  { emoji: '🧩', shortcode: 'jigsaw' },
  { emoji: '🎨', shortcode: 'art' },
  { emoji: '🖌️', shortcode: 'paintbrush' },
  { emoji: '🖍️', shortcode: 'crayon' },
  { emoji: '🎬', shortcode: 'clapper' },
  { emoji: '🎧', shortcode: 'headphones' },
  { emoji: '🎵', shortcode: 'musical_note' },
  { emoji: '🎸', shortcode: 'guitar' },
  { emoji: '🎹', shortcode: 'musical_keyboard' },
  { emoji: '🥁', shortcode: 'drum' },
  { emoji: '🎮', shortcode: 'video_game' },
  { emoji: '🎲', shortcode: 'game_die' },
  { emoji: '🧸', shortcode: 'teddy_bear' },
  { emoji: '🎁', shortcode: 'gift' },
  { emoji: '💎', shortcode: 'gem' },
  { emoji: '💰', shortcode: 'moneybag' },
  { emoji: '💳', shortcode: 'credit_card' },
  { emoji: '📚', shortcode: 'books' },
  { emoji: '📖', shortcode: 'book' },
  { emoji: '✏️', shortcode: 'pencil2' },
  { emoji: '✒️', shortcode: 'black_nib' },
  { emoji: '🖊️', shortcode: 'pen' },
  { emoji: '📐', shortcode: 'triangular_ruler' },
  { emoji: '📏', shortcode: 'straight_ruler' },
  { emoji: '🧮', shortcode: 'abacus' },
  { emoji: '🔬', shortcode: 'microscope' },
  { emoji: '🔭', shortcode: 'telescope' },
  { emoji: '🛰️', shortcode: 'satellite' },
  { emoji: '🧲', shortcode: 'magnet' },
  { emoji: '🔋', shortcode: 'battery' },
  { emoji: '🔌', shortcode: 'electric_plug' },
  { emoji: '💾', shortcode: 'floppy_disk' },
  { emoji: '💿', shortcode: 'cd' },
  { emoji: '📀', shortcode: 'dvd' },
  { emoji: '📷', shortcode: 'camera' },
  { emoji: '🎥', shortcode: 'movie_camera' },
  { emoji: '📺', shortcode: 'tv' },
  { emoji: '📻', shortcode: 'radio' },
  { emoji: '☎️', shortcode: 'telephone' },
  { emoji: '📞', shortcode: 'telephone_receiver' },
  { emoji: '📟', shortcode: 'pager' },
  { emoji: '📠', shortcode: 'fax' },
  { emoji: '✉️', shortcode: 'envelope' },
  { emoji: '📧', shortcode: 'email' },
  { emoji: '📨', shortcode: 'incoming_envelope' },
  { emoji: '📮', shortcode: 'postbox' },
  { emoji: '🏠', shortcode: 'house' },
  { emoji: '🏢', shortcode: 'office' },
  { emoji: '🏭', shortcode: 'factory' },
  { emoji: '🏗️', shortcode: 'building_construction' },
  { emoji: '🚦', shortcode: 'vertical_traffic_light' },
  { emoji: '🛑', shortcode: 'stop_sign' },
  { emoji: '🚗', shortcode: 'car' },
  { emoji: '🚕', shortcode: 'taxi' },
  { emoji: '🚲', shortcode: 'bike' },
  { emoji: '🛵', shortcode: 'motor_scooter' },
  { emoji: '🚂', shortcode: 'steam_locomotive' },
  { emoji: '✈️', shortcode: 'airplane' },
  { emoji: '🚁', shortcode: 'helicopter' },
  { emoji: '⛵', shortcode: 'sailboat' },
  { emoji: '🚢', shortcode: 'ship' },
  { emoji: '🧗', shortcode: 'climbing' },
  { emoji: '🏃', shortcode: 'runner' },
  { emoji: '🚴', shortcode: 'bicyclist' },
  { emoji: '🧘', shortcode: 'meditation' },
  { emoji: '💤', shortcode: 'zzz' },
  { emoji: '💤', shortcode: 'sleeping' },
  { emoji: '🕹️', shortcode: 'joystick' },
  { emoji: '🧵', shortcode: 'thread' },
  { emoji: '🪡', shortcode: 'sewing_needle' },
  { emoji: '🧶', shortcode: 'yarn' },
  { emoji: '🪢', shortcode: 'knot' },
  { emoji: '🫧', shortcode: 'bubbles' },
  { emoji: '💧', shortcode: 'droplet' },
  { emoji: '🌡️', shortcode: 'thermometer' },
  { emoji: '❄️', shortcode: 'snowflake' },
  { emoji: '🎈', shortcode: 'balloon' },
  { emoji: '🎆', shortcode: 'fireworks' },
  { emoji: '🪄', shortcode: 'magic_wand' },
  { emoji: '🔮', shortcode: 'crystal_ball' },
  { emoji: '🧿', shortcode: 'nazar_amulet' },
  { emoji: '📿', shortcode: 'prayer_beads' },
  { emoji: '♻️', shortcode: 'recycle' },
  { emoji: '🆕', shortcode: 'new' },
  { emoji: '🆗', shortcode: 'ok' },
  { emoji: '🔴', shortcode: 'red_circle' },
  { emoji: '🟠', shortcode: 'orange_circle' },
  { emoji: '🟡', shortcode: 'yellow_circle' },
  { emoji: '🟢', shortcode: 'green_circle' },
  { emoji: '🔵', shortcode: 'blue_circle' },
  { emoji: '🟣', shortcode: 'purple_circle' },
  { emoji: '⚫', shortcode: 'black_circle' },
  { emoji: '⚪', shortcode: 'white_circle' }
]

/** Lazy exact index, built once on the first completed shortcode. */
let exactShortcode: ReadonlyMap<string, WorkspaceEmojiSuggestion> | null = null

function exactShortcodeIndex(): ReadonlyMap<string, WorkspaceEmojiSuggestion> {
  if (!exactShortcode) {
    exactShortcode = new Map(
      WORKSPACE_EMOJI_CATALOG.map((entry) => [entry.shortcode, entry] as const)
    )
  }
  return exactShortcode
}

const MATCH_TIER = { exact: 0, prefix: 1, wordStart: 2, substring: 3 } as const

function matchTier(shortcode: string, query: string): number | null {
  const index = shortcode.indexOf(query)
  if (index === -1) {
    return null
  }
  if (index === 0) {
    return shortcode.length === query.length ? MATCH_TIER.exact : MATCH_TIER.prefix
  }
  return /[_-]/.test(shortcode[index - 1]) ? MATCH_TIER.wordStart : MATCH_TIER.substring
}

export function searchWorkspaceEmojiShortcodes(
  query: string,
  limit = 8
): WorkspaceEmojiSuggestion[] {
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery || limit <= 0) {
    return []
  }

  const matches = WORKSPACE_EMOJI_CATALOG.flatMap((entry) => {
    const tier = matchTier(entry.shortcode, normalizedQuery)
    return tier === null ? [] : [{ ...entry, tier }]
  }).sort(
    (left, right) =>
      left.tier - right.tier ||
      left.shortcode.length - right.shortcode.length ||
      left.shortcode.localeCompare(right.shortcode)
  )
  const seenEmoji = new Set<string>()
  const suggestions: WorkspaceEmojiSuggestion[] = []
  for (const { emoji, shortcode } of matches) {
    if (seenEmoji.has(emoji)) {
      continue
    }
    seenEmoji.add(emoji)
    suggestions.push({ emoji, shortcode })
    if (suggestions.length === limit) {
      break
    }
  }
  return suggestions
}

export function getActiveWorkspaceEmojiShortcode(
  value: string,
  cursor: number | null
): ActiveWorkspaceEmojiShortcode | null {
  if (cursor === null || cursor < 0 || cursor > value.length) {
    return null
  }
  const match = value.slice(0, cursor).match(/(^|\s):([a-z0-9_+-]{1,40})$/i)
  if (!match) {
    return null
  }
  return {
    start: cursor - match[2].length - 1,
    end: cursor,
    query: match[2].toLowerCase()
  }
}

export function replaceCompletedWorkspaceEmojiShortcode(
  value: string,
  cursor: number | null
): WorkspaceEmojiReplacement | null {
  if (cursor === null || cursor < 0 || cursor > value.length) {
    return null
  }
  const match = value.slice(0, cursor).match(/(^|\s):([a-z0-9_+-]{1,40}):$/i)
  if (!match) {
    return null
  }
  const suggestion = exactShortcodeIndex().get(match[2].toLowerCase())
  if (!suggestion) {
    return null
  }
  const start = cursor - match[2].length - 2
  return replaceWorkspaceEmojiRange(value, start, cursor, suggestion.emoji)
}

export function applyWorkspaceEmojiSuggestion(
  value: string,
  active: ActiveWorkspaceEmojiShortcode,
  suggestion: WorkspaceEmojiSuggestion
): WorkspaceEmojiReplacement {
  return replaceWorkspaceEmojiRange(value, active.start, active.end, suggestion.emoji, true)
}

function replaceWorkspaceEmojiRange(
  value: string,
  start: number,
  end: number,
  emoji: string,
  addTrailingSpace = false
): WorkspaceEmojiReplacement {
  const hasFollowingWhitespace = /\s/.test(value[end] ?? '')
  const trailingSpace = addTrailingSpace && !hasFollowingWhitespace ? ' ' : ''
  return {
    value: `${value.slice(0, start)}${emoji}${trailingSpace}${value.slice(end)}`,
    cursor: start + emoji.length + (addTrailingSpace ? 1 : 0)
  }
}
