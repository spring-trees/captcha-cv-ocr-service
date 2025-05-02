local getEnv(branch) =
  if branch == 'master' then 'prod'
  else error 'Unknown branch: ' + branch;

local stepTemplates = {
  dockerBuildAndPush(branch):: {
    name: 'docker-build-and-push-' + getEnv(branch),
    image: 'plugins/ecr',
    environment: {
      VERSION: '${DRONE_BRANCH}#${DRONE_COMMIT}',
      GITHUB_USERNAME: { from_secret: 'GITHUB_USERNAME' },
      GITHUB_TOKEN: { from_secret: 'GITHUB_TOKEN' },
    },
    settings: {
      access_key: { from_secret: 'AWS_ACCESS_KEY_ID' },
      secret_key: { from_secret: 'AWS_SECRET_ACCESS_KEY' },
      region: 'ap-northeast-1',
      registry: '409573773462.dkr.ecr.ap-northeast-1.amazonaws.com',
      repo: 'captcha-cv-ocr-service',
      tags: [branch],
      build_args: [
        'VERSION',
        'GITHUB_USERNAME',
        'GITHUB_TOKEN',
      ],
    },
    when: { branch: [branch] },
  },
};


{
  kind: 'pipeline',
  name: 'default',
  type: 'docker',

  trigger: {
    branch: [
      'master',
    ],
    event: {
      include: ['push'],
      exclude: ['pull_request'],
    },
  },
  steps: [
    stepTemplates.dockerBuildAndPush('master'),
  ],
}