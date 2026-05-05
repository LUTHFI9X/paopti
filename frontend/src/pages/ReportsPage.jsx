import { useEffect, useState } from 'react'
import { getModuleInfo } from '../services/spiHubApi'

function ReportsPage() {
  const [moduleInfo, setModuleInfo] = useState({
    module: 'Reports',
    description: '',
  })

  useEffect(() => {
    getModuleInfo('/reports')
      .then((data) => {
        setModuleInfo(data)
      })
      .catch(() => {
        setModuleInfo({
          module: 'Reports',
          description: 'Failed to load module information.',
        })
      })
  }, [])

  return (
    <section className="page-wrap">
      <div className="page-header">
        <h2>{moduleInfo.module}</h2>
        <p>Generate and review audit report documents with approval metadata.</p>
      </div>
      <article className="card">
        <p>{moduleInfo.description}</p>
      </article>
    </section>
  )
}

export default ReportsPage
