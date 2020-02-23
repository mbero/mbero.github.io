---
layout: post
title:  "Three types of JUnit tests in Spring Boot"
date:   2019-12-21 16:00:00 +0700
categories: [java, spring, junit]
---
You are able to test your Spring web applications in few different ways with JUnit only. Here are three examples:

# 1.Isolation unit tests with Mockito

# 2.Integration services tests with @SpringJUnit4ClassRunner

# 3.Controllers e2e testing with @SpringBootTest

Here we put short summary of how these tests works based on some example application from [https://github.com/mbero/budget_app](https://github.com/mbero/budget_app) repository.


I
# 1.Isolation unit tests with Mockito

With these kind of tests, we are prepared Mocks of the dependencies in our tested service, and by using static methods like *Mockito.when* we configure behaviour of our Mocks.
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
    private Expense testExpense;
    private List<Expense> expenses;
    
    @BeforeEach
    
    public void setUp() {
    integrationTestUtil = new TestUtils();
    expenses = integrationTestUtil.generateGivenAmounOfTestExpenseObjects(1, 1, Timestamp.valueOf("2018-11-12 01:00:00.123456789"));
    
    Mockito.when(expenseRepository.findAll()).thenReturn(expenses)
      
    }


`@Mock` - this annotation tells the compiler, that annotated service will be mocked in further code inside JUnit test

`@InjectMocks` - this annotation is responsible for telling the compiler which service will be feeded with configured Mocks

`Mockito.when` - this methods configures behaviour of Mocked service. In simple words: we use when -> then construction to tell what should be returned for given method of Mocked service, when the configured method will be called.
In this example - 
`ExpensesServiceImpl` has autowired `ExpenseRepository` as an internal dependency. To be able to unit test only ExpensesServiceImpl behaviour, we have to be sure that ExpenseRepository will be returned appropiate values when its necessary.
That why in line:

     expenses = integrationTestUtil.generateGivenAmounOfTestExpenseObjects(1, 1, Timestamp.valueOf("2018-11-12 01:00:00.123456789"));
    
we are generating some list of test values, which be returned by `expenseRepository.findAll()` method when it will be used inside `ExpenseServiceImpl` during test execution.
We are doing it exactly by this line:

     Mockito.when(expenseRepository.findAll()).thenReturn(expenses)
