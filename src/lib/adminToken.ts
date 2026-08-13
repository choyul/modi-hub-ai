/**
 * 마스터키 보관 위치.
 *
 * 별도 파일로 뺀 이유: useStats 와 useAdminApi 가 서로를 필요로 해서
 * 한쪽이 다른 쪽에서 이 상수를 가져오면 순환 참조가 된다. 상수 하나는
 * 아무에게도 의존하지 않는 자리에 두는 편이 낫다.
 */
export const ADMIN_TOKEN_KEY = 'modi_admin_token';
