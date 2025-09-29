const Bubble = ({ message }: { message: any }) => {
  return (
    <div className={`bubble ${message.role}`}>
      {message.content}
    </div>
  )
}

export default Bubble