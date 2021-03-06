
---
layout: post
title:  "Three types of JUnit tests in Spring Boot"
date:   2019-12-21 16:00:00 +0700
categories:   [java,spring,junit]

---
You are able to test your Spring web applications in few different ways with JUnit only. You can perform for example:

# 1.Isolation unit tests with Mockito

# 2.Integration services tests with @SpringJUnit4ClassRunner

# 3.Controllers e2e testing with @SpringBootTest

Here we put short summary of how these tests works based on some example application from [https://github.com/mbero/budget_app](https://github.com/mbero/budget_app) repository.


# 1.Isolation unit tests with Mockito

With these kind of tests, we are prepared Mocks of the dependencies in our tested service.By using static methods like `org.mockito.Mockito.when()`  we configure behaviour of our Mocks.
Lets look on example:

    @SpringBootTest(webEnvironment = WebEnvironment.NONE)
    public class ExpensesServiceImplTest {
	    
	    @InjectMocks
	    private ExpensesServiceImpl expenseService;
	    
	    @Mock
	    private ExpenseRepository expenseRepository;
	    @Mock
	    private TagsService tagService;
	    @Mock
	    private CommonTools tools;
	    
	    private TestUtils integrationTestUtil;
	    private List<Expense> expenses;
	    
	    @BeforeEach
	    public void setUp() {
		    integrationTestUtil = new TestUtils();
		    expenses = integrationTestUtil.generateGivenAmounOfTestExpenseObjects(1, 1, Timestamp.valueOf("2018-11-12 01:00:00.123456789"));
		    Mockito.when(expenseRepository.findAll()).thenReturn(expenses)
		      
	    }
	    
		@Test
		public void testGetAllExpenses() {
			Optional<List<Expense>> allExpenses = expenseService.getAllExpenses();
			assertTrue(allExpenses.get().size() > 0);
		}


`@Mock` - this annotation tells the compiler, that annotated service will be mocked in further code inside JUnit test

`@InjectMocks` - this annotation is responsible for telling the compiler which service will be feeded with configured Mocks

`@Before`  or `@BeforeEach` (in Junit5) - this annotation is used for method which will be invoked before every unit test (@Test annotated method)  in given file. For example: if we will have **five** instances of @Test annotated methods, method annotated with `@Before` will be invoked **five** times. We are using this to prepare proper objects before test will be invoked. It's very important to remember - order or JUnit test invocation is **not deterministic** - its not related to order of @Test methods in our file.


`Mockito.when` - this methods configures behavior of Mocked service. We are using `when -> then` construction to tell what should be returned for given method of Mocked service, when the configured method will be called.
In this example - 
`ExpensesServiceImpl` has autowired `ExpenseRepository` as an internal dependency. To be able to unit test only `ExpensesServiceImpl` behavior, we have to be sure that ExpenseRepository will return appropiate values when its necessary.
That's why in line:

     expenses = integrationTestUtil.generateGivenAmounOfTestExpenseObjects(1, 1, Timestamp.valueOf("2018-11-12 01:00:00.123456789"));
    
we are generating some list of test values, which be returned by `expenseRepository.findAll()` method when it will be used inside `ExpenseServiceImpl` during test execution.
We are doing it exactly by this line:

     Mockito.when(expenseRepository.findAll()).thenReturn(expenses)

Finally, in given @Test case: 

    @Test
    	public void testGetAllExpenses() {
    		Optional<List<Expense>> allExpenses = expenseService.getAllExpenses();
    		assertTrue(allExpenses.get().size() > 0);
    	}

we are retreiving results from `expenseService`, which will return mocked values from `expenseRepository`, defined in `@BeforeEach` annotated method. 
To be sure that getAllExpensesMethod() is working correctly, we can do few different assertions. Basic one should check if retreived list of expenses has actually any elements: 

    assertTrue(allExpenses.get().size() > 0);

# 2.Integration services tests with @SpringJUnit4ClassRunner

With these kind of tests, we **are not** using Mocks - instead of that, we are running tests with loaded application context, and using real services and repositories injections.
Lets look on example:


    @RunWith(SpringJUnit4ClassRunner.class)
    //Integration tests ( Application context is used instead of mocks for repository )
    @ContextConfiguration(classes = { WebSecurityConfig.class })
    @Transactional
    public class ExpensesServiceIntegrationImplTest {
    
    	@Autowired
    	private ExpensesService expenseService;
    	
    	private TestUtils testUtils;
    
    	@Before
    	public void setUp() {
    		testUtils = new TestUtils();
    	}
    	@Test
    	public void testGetExpenses() {
    		List<Expense> allExpenses = expenseService.getAllExpenses().get();
    		if (allExpenses.size() == 0) {
    			try {
    				expenseService.createExpense(getTestExpenseObj());
    			} catch (Exception e) {
    				e.printStackTrace();
    			}
    			assertTrue(expenseService.getAllExpenses().get().size() > 0);
    		} else {
    			assertTrue(allExpenses.size() > 0);
    		}
    
    	}

Annotations:

     @RunWith(SpringJUnit4ClassRunner.class) 
     @ContextConfiguration(classes = { WebSecurityConfig.class })
     
are crucial for this kind of integration tests  because they allows us to use  automatically wired dependencies which are part of testes service.
In this case: 

    @Autowired private ExpensesService expenseService;

expenseService could be used with all the dependencies inside without need of mocking them. 
So its possible to invoke expenseService directly like in this 

    List<Expense> allExpenses = expenseService.getAllExpenses().get();

Writing an integration test with possibilities like this, makes it very intuitive. Whole test case could like like: 

    @Test
    	public void testGetExpenses() {
    	List<Expense> allExpenses=expenseService.getAllExpenses().get();
    		if (allExpenses.size() == 0) {
    			try {
    				expenseService.createExpense(getTestExpenseObj());
    			} catch (Exception e) {
    				e.printStackTrace();
    			}
    		assertTrue(expenseService.getAllExpenses().get().size() > 0);
    		} else {
    			assertTrue(allExpenses.size() > 0);
    		}
    }
We first  checking if expensesService.getAllExpenses() will return any actual result-  if not, we create expense by ourself:

    expenseService.createExpense(getTestExpenseObj())

Whole assertion is just checking if list returned by `getAllExpenses()`  method has any elements.


# 2.E2E controllers tests with @RunWith(SpringRunner.class)

Similar to services integration tests, we are not using mocks here.
Combination of these annotations :

    @RunWith(SpringRunner.class)
    @SpringBootTest(webEnvironment =SpringBootTest.WebEnvironment.RANDOM_PORT)
	
allows us to load Spring application context and inject @Autowired instances of services into our test (it's actually does more than that according to *Spring Reference Manual*), and sets a server port on random number, triggering listening on this port.
Thanks to that, in our test we can make a requests to tested controller endpoints.

Lets take a look on this fragment of code:

    @RunWith(SpringRunner.class)
    @SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
    public class BudgetControllerTestWithSpringRunner {
    
    	@LocalServerPort
    	private int port;
    	private TestRestTemplate restTemplate = new TestRestTemplate();
    	private HttpHeaders headers = new HttpHeaders();
    
    	@Test
    	public void testAddExpense() throws Exception {
    		TestUtils testUtils = new TestUtils();
    		Expense testExpenseToAdd = testUtils.generateTestExpense(20, null);
    		HttpEntity<Expense> entity = new HttpEntity<Expense>(testExpenseToAdd, headers);
    		ResponseEntity<ExpensesList> response = restTemplate.exchange(createURLWithPort("/expense"), HttpMethod.POST,
    				entity, ExpensesList.class);
    
    		assertTrue(response.getStatusCode().equals(HttpStatus.OK));
    		assertTrue(response.getBody().getExpenses().size() > 0);
    	}


In this fragment:

    @LocalServerPort
    private int port;
    private TestRestTemplate restTemplate = new TestRestTemplate();
    private HttpHeaders headers = new HttpHeaders();
   
   we are declaring:
   - port which will be used for the invoked server
   - TestRestTemplate object for executing requests to proper endpoints
   - HttpHeaders which will be used for these requests

Inside test itself:

		@Test
    	public void testAddExpense() throws Exception {
    		TestUtils testUtils = new TestUtils();
    		Expense testExpenseToAdd = testUtils.generateTestExpense(20, null);
    		HttpEntity<Expense> entity = new HttpEntity<Expense>(testExpenseToAdd, headers);
    		ResponseEntity<ExpensesList> response = 
			restTemplate.exchange(createURLWithPort("/expense"), HttpMethod.POST,
    				entity, ExpensesList.class);
    
    		assertTrue(response.getStatusCode().equals(HttpStatus.OK));
    		assertTrue(response.getBody().getExpenses().size() > 0);
    	}

1.We are creating HttpEntity using previously generated test object and headers:
			
			HttpEntity<Expense> entity = new HttpEntity<Expense>(testExpenseToAdd, headers);
    		
2.We are executing request itself, with created HttpEntity, HttpMethod and returned java object class (endpoint JSON response will be automatically parsed into proper Java object);


			ResponseEntity<ExpensesList> response = 
			restTemplate.exchange
			(createURLWithPort("/expense"), HttpMethod.POST,entity, ExpensesList.class);

3.We are making assertions, to first check Http response status code and returned collections itself

			assertTrue(response.getStatusCode().equals(HttpStatus.OK));
    		assertTrue(response.getBody().getExpenses().size() > 0);
			
