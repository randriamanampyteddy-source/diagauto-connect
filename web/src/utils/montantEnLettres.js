const u = ['','un','deux','trois','quatre','cinq','six','sept','huit','neuf',
           'dix','onze','douze','treize','quatorze','quinze','seize',
           'dix-sept','dix-huit','dix-neuf']
const d = ['','','vingt','trente','quarante','cinquante','soixante',
           'soixante','quatre-vingt','quatre-vingt']

function centaines(n) {
  if (n === 0) return ''
  if (n < 20) return u[n]
  const di = Math.floor(n / 10), un = n % 10
  if (di === 7 || di === 9) {
    return d[di] + (un === 1 && di === 7 ? '-et-' : '-') + u[10 + un]
  }
  if (di === 8) return 'quatre-vingt' + (un > 0 ? '-' + u[un] : 's')
  return d[di] + (un === 1 && di < 7 ? '-et-' : un > 0 ? '-' : '') + (un > 0 ? u[un] : '')
}

function bloc(n) {
  if (n === 0) return ''
  const c = Math.floor(n / 100), r = n % 100
  const pc = c > 1 ? u[c] + ' cent' + (r === 0 && c > 1 ? 's' : '') : c === 1 ? 'cent' : ''
  const pr = centaines(r)
  return [pc, pr].filter(Boolean).join(' ')
}

export function montantEnLettres(montant) {
  const n = Math.round(Number(montant))
  if (isNaN(n) || n < 0) return ''
  if (n === 0) return 'Zéro ariary'

  const t = Math.floor(n / 1_000_000_000)
  const mi = Math.floor((n % 1_000_000_000) / 1_000_000)
  const k  = Math.floor((n % 1_000_000) / 1_000)
  const r  = n % 1_000

  const parts = []
  if (t  > 0) parts.push((t  === 1 ? 'un' : bloc(t))  + ' milliard'  + (t  > 1 ? 's' : ''))
  if (mi > 0) parts.push((mi === 1 ? 'un' : bloc(mi)) + ' million'   + (mi > 1 ? 's' : ''))
  if (k  > 0) parts.push((k  === 1 ? 'mille' : bloc(k) + ' mille'))
  if (r  > 0) parts.push(bloc(r))

  const lettres = parts.join(' ')
  return lettres.charAt(0).toUpperCase() + lettres.slice(1) + ' ariary'
}
