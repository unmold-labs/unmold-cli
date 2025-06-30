import {runCommand} from '@oclif/test'
import {expect} from 'chai'
import nock from 'nock'

describe('whoami', () => {
  it('shows user email when logged in', async () => {
    nock('https://api.example.com')
      .get('/account')
      // user is logged in, return their name
      .reply(200, {email: 'jeff@example.com'})

    const {stdout} = await runCommand('whoami')
    expect(stdout).to.equal('jeff@example.com')
  })

  it('exits with status 100 when not logged in', async () => {
    nock('https://api.example.com')
      .get('/account')
      // HTTP 401 means the user is not logged in with valid credentials
      .reply(401)

    const {error} = await runCommand('whoami')
    expect(error?.oclif?.exit).to.equal(100)
  })
})