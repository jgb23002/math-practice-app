function MathFriends() {
  return (
    <div className="math-friends" aria-hidden="true">
      <div className="friends-orbit" />
      <span className="floating-symbol floating-symbol--minus">−</span>
      <span className="floating-symbol floating-symbol--divide">÷</span>
      <span className="little-star little-star--one">✦</span>
      <span className="little-star little-star--two">✦</span>
      <span className="confetti confetti--one" />
      <span className="confetti confetti--two" />
      <div className="friend friend--blue">
        <span className="friend-symbol">+</span>
        <span className="friend-eyes" />
        <span className="friend-smile" />
      </div>
      <div className="friend friend--peach">
        <span className="friend-symbol">×</span>
        <span className="friend-eyes" />
        <span className="friend-smile" />
      </div>
      <span className="friends-note">You&apos;ve got this!</span>
    </div>
  )
}

export default MathFriends
